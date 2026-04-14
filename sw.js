// Service Worker for offline functionality and caching strategy
// Cache version auto-updates daily to bust old caches

const CACHE_VERSION = 'luma-v' + new Date().toISOString().split('T')[0]; // Changes daily
const CACHE_URLS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/Pic.png',
  '/manifest.json'
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      console.log('Caching essential files');
      return cache.addAll(CACHE_URLS).catch((error) => {
        console.warn('Some files could not be cached:', error);
        // Don't fail install if some files can't be cached
        return cache.addAll([
          '/index.html',
          '/style.css',
          '/script.js',
          '/manifest.json'
        ]);
      });
    })
  );
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_VERSION)
          .map((cacheName) => {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip cross-origin requests
  if (!request.url.startsWith(self.location.origin)) {
    return;
  }

  // Use cache-first strategy for GET requests
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) {
          console.log('Serving from cache:', request.url);
          return response;
        }

        return fetch(request)
          .then((networkResponse) => {
            // Cache successful responses for future use
            if (
              networkResponse &&
              networkResponse.status === 200 &&
              networkResponse.type !== 'opaque'
            ) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_VERSION).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            // Return cached version if available, otherwise offline fallback
            return caches.match(request).then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Return offline page if available
              return caches.match('/index.html');
            });
          });
      })
    );
  }
});

// Handle messages from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Periodic Background Sync - for showing data instantly
self.addEventListener('periodicsync', (event) => {
  console.log('Periodic background sync triggered:', event.tag);
  
  if (event.tag === 'sync-data') {
    event.waitUntil(
      (async () => {
        try {
          // Fetch latest data from server
          const response = await fetch('/api/sync-data');
          if (response.ok) {
            const data = await response.json();
            // Store in IndexedDB or localStorage
            const cache = await caches.open(CACHE_VERSION);
            cache.put('/api/sync-data', response.clone());
            console.log('Data synced successfully:', data);
            // Notify client of new data
            self.clients.matchAll().then((clients) => {
              clients.forEach((client) => {
                client.postMessage({
                  type: 'DATA_UPDATED',
                  data: data
                });
              });
            });
          }
        } catch (error) {
          console.error('Periodic sync failed:', error);
        }
      })()
    );
  }
});

// Background Sync - for resilience to poor network connections
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-notes') {
    event.waitUntil(
      (async () => {
        try {
          // Attempt to sync pending notes to server
          const db = await openDatabase();
          const pendingNotes = await getPendingNotes(db);
          
          for (const note of pendingNotes) {
            try {
              const response = await fetch('/api/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(note)
              });
              
              if (response.ok) {
                await markNoteSynced(db, note.id);
                console.log('Note synced:', note.id);
              }
            } catch (error) {
              console.error('Failed to sync note:', error);
              throw error; // Retry sync
            }
          }
          
          console.log('All pending notes synced');
        } catch (error) {
          console.error('Background sync failed:', error);
          throw error; // Retry sync
        }
      })()
    );
  }
});

// Push Notifications - for re-engaging users
self.addEventListener('push', (event) => {
  console.log('Push notification received');
  
  const options = {
    body: 'Study session reminder!',
    icon: '/192.png',
    badge: '/192.png',
    tag: 'luma-study-notification',
    requireInteraction: false,
    actions: [
      {
        action: 'start-timer',
        title: 'Start Timer'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };
  
  try {
    const data = event.data ? event.data.json() : {};
    options.body = data.body || options.body;
    options.title = data.title || 'Luma Study';
  } catch (error) {
    console.log('Push notification has no JSON data');
  }
  
  event.waitUntil(
    self.registration.showNotification(options.title || 'Luma Study', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.action);
  event.notification.close();
  
  const urlToOpen = new URL('/', self.location.origin).href;
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Check if app window is already open
      for (let i = 0; i < clients.length; i++) {
        const client = clients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          if (event.action === 'start-timer') {
            client.postMessage({ type: 'START_TIMER' });
          }
          return client.focus();
        }
      }
      // Open new window if not found
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Helper functions for IndexedDB
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('LumaStudy', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('notes')) {
        db.createObjectStore('notes', { keyPath: 'id' });
      }
    };
  });
}

function getPendingNotes(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('notes', 'readonly');
    const store = transaction.objectStore('notes');
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const notes = request.result.filter((note) => !note.synced);
      resolve(notes);
    };
  });
}

function markNoteSynced(db, noteId) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('notes', 'readwrite');
    const store = transaction.objectStore('notes');
    const request = store.get(noteId);
    
    request.onsuccess = () => {
      const note = request.result;
      note.synced = true;
      const updateRequest = store.put(note);
      updateRequest.onerror = () => reject(updateRequest.error);
      updateRequest.onsuccess = () => resolve();
    };
  });
}
