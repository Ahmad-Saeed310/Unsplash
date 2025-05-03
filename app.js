// Unsplash API configuration
const UNSPLASH_API = {
    baseUrl: 'https://api.unsplash.com',
    // Replace this with your actual Unsplash API access key
    accessKey: 'm4Hw2hi9VD1ZJtrrf-lTxzxMKNkjgZh_pjKg4CDR8B0',
    perPage: 12
};

// DOM Elements
const elements = {
    searchInput: document.getElementById('search-input'),
    searchButton: document.getElementById('search-button'),
    gallery: document.getElementById('gallery'),
    loadingIndicator: document.getElementById('loading'),
    loadMoreButton: document.getElementById('load-more'),
    favoritesToggle: document.getElementById('favorites-toggle'),
    noResults: document.getElementById('no-results'),
    galleryTitle: document.getElementById('gallery-title'),
    galleryDescription: document.getElementById('gallery-description'),
    photoModal: document.getElementById('photo-modal'),
    closeModal: document.getElementById('close-modal'),
    modalImage: document.getElementById('modal-image'),
    modalUsername: document.getElementById('modal-username'),
    modalUserImg: document.getElementById('modal-user-img'),
    modalUserLink: document.getElementById('modal-user-link'),
    modalFavorite: document.getElementById('modal-favorite'),
    modalDownload: document.getElementById('modal-download'),
    modalDate: document.getElementById('modal-date'),
    modalDescription: document.getElementById('modal-description')
};

// State variables
let state = {
    photos: [],
    currentPage: 1,
    currentQuery: '',
    hasMore: false,
    showingFavorites: false,
    favorites: JSON.parse(localStorage.getItem('unsplash-favorites') || '[]')
};

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    elements.searchButton.addEventListener('click', handleSearch);
    elements.searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    elements.loadMoreButton.addEventListener('click', loadMorePhotos);
    elements.favoritesToggle.addEventListener('click', toggleFavorites);
    elements.closeModal.addEventListener('click', closePhotoModal);
    elements.modalFavorite.addEventListener('click', () => {
        const id = elements.modalImage.dataset.id;
        toggleFavoritePhoto(id);
    });

    // Load initial photos
    fetchPopularPhotos();
});

// Fetch popular photos on initial load
async function fetchPopularPhotos() {
    showLoading(true);
    try {
        const url = `${UNSPLASH_API.baseUrl}/photos?page=${state.currentPage}&per_page=${UNSPLASH_API.perPage}&order_by=popular`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Client-ID ${UNSPLASH_API.accessKey}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch photos');
        
        const data = await response.json();
        state.photos = data;
        state.hasMore = data.length === UNSPLASH_API.perPage;
        state.currentQuery = '';
        
        renderPhotos(data);
        updateLoadMoreButton();
        elements.galleryTitle.textContent = 'Popular Photos';
        elements.galleryDescription.textContent = 'Browse popular photos from Unsplash';
    } catch (error) {
        console.error('Error fetching popular photos:', error);
        showError('Failed to load photos. Please try again later.');
    } finally {
        showLoading(false);
    }
}

// Search photos
async function searchPhotos(query, page = 1) {
    if (!query.trim()) {
        fetchPopularPhotos();
        return;
    }
    
    showLoading(true);
    elements.noResults.classList.add('hidden');
    
    try {
        const url = `${UNSPLASH_API.baseUrl}/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=${UNSPLASH_API.perPage}`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Client-ID ${UNSPLASH_API.accessKey}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to search photos');
        
        const data = await response.json();
        
        if (page === 1) {
            state.photos = data.results;
            elements.galleryTitle.textContent = `Search Results: "${query}"`;
            elements.galleryDescription.textContent = `${data.total} photos found for "${query}"`;
        } else {
            state.photos = [...state.photos, ...data.results];
        }
        
        state.hasMore = data.total > state.photos.length;
        state.currentQuery = query;
        
        if (data.results.length === 0 && page === 1) {
            elements.noResults.classList.remove('hidden');
            elements.gallery.innerHTML = '';
            elements.loadMoreButton.classList.add('hidden');
        } else {
            renderPhotos(data.results, page !== 1);
            updateLoadMoreButton();
        }
    } catch (error) {
        console.error('Error searching photos:', error);
        showError('Failed to search photos. Please try again later.');
    } finally {
        showLoading(false);
    }
}

// Load more photos
function loadMorePhotos() {
    state.currentPage++;
    if (state.showingFavorites) {
        return; // No need to load more for favorites
    } else if (state.currentQuery) {
        searchPhotos(state.currentQuery, state.currentPage);
    } else {
        fetchMorePopularPhotos();
    }
}

// Fetch more popular photos
async function fetchMorePopularPhotos() {
    showLoading(true);
    try {
        const url = `${UNSPLASH_API.baseUrl}/photos?page=${state.currentPage}&per_page=${UNSPLASH_API.perPage}&order_by=popular`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Client-ID ${UNSPLASH_API.accessKey}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch more photos');
        
        const data = await response.json();
        state.photos = [...state.photos, ...data];
        state.hasMore = data.length === UNSPLASH_API.perPage;
        
        renderPhotos(data, true);
        updateLoadMoreButton();
    } catch (error) {
        console.error('Error fetching more photos:', error);
        showError('Failed to load more photos. Please try again later.');
    } finally {
        showLoading(false);
    }
}

// Render photos
function renderPhotos(photos, append = false) {
    if (!append) {
        elements.gallery.innerHTML = '';
    }
    
    photos.forEach(photo => {
        const isInFavorites = state.favorites.some(fav => fav.id === photo.id);
        const article = document.createElement('article');
        article.className = 'image-card bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg';
        article.innerHTML = `
            <div class="relative">
                <img src="${photo.urls.small}" alt="${photo.alt_description || 'Unsplash photo'}" 
                    class="w-full h-64 object-cover cursor-pointer"
                    data-id="${photo.id}" data-full="${photo.urls.full}">
                <button class="favorite-btn absolute top-3 right-3 bg-white bg-opacity-70 rounded-full p-2 text-xl shadow-sm hover:bg-opacity-100 transition-all ${isInFavorites ? 'active' : ''}" 
                    data-id="${photo.id}">
                    <i class="fas fa-star"></i>
                </button>
            </div>
            <div class="p-4">
                <div class="flex items-center">
                    <img src="${photo.user.profile_image.small}" alt="${photo.user.name}" class="w-8 h-8 rounded-full mr-2">
                    <div>
                        <h3 class="font-medium text-sm">${photo.user.name}</h3>
                        <a href="${photo.user.links.html}?utm_source=unsplash_gallery&utm_medium=referral" target="_blank" class="text-xs text-blue-500">@${photo.user.username}</a>
                    </div>
                </div>
                <div class="mt-3 text-sm text-gray-500">
                    <span>${new Date(photo.created_at).toLocaleDateString()}</span>
                </div>
            </div>
        `;
        
        elements.gallery.appendChild(article);
        
        // Add click event to open modal
        const img = article.querySelector('img');
        img.addEventListener('click', () => {
            openPhotoModal(photo);
        });
        
        // Add click event to favorite button
        const favoriteBtn = article.querySelector('.favorite-btn');
        favoriteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavoritePhoto(photo.id);
        });
    });
}

// Toggle favorite photo
function toggleFavoritePhoto(photoId) {
    const isInFavorites = state.favorites.some(fav => fav.id === photoId);
    let photo;
    
    if (isInFavorites) {
        state.favorites = state.favorites.filter(fav => fav.id !== photoId);
    } else {
        photo = state.photos.find(p => p.id === photoId);
        if (photo) {
            state.favorites.push(photo);
        }
    }
    
    // Update UI
    const favBtns = document.querySelectorAll(`.favorite-btn[data-id="${photoId}"]`);
    favBtns.forEach(btn => btn.classList.toggle('active'));
    
    // Update modal if open
    if (elements.modalImage.dataset.id === photoId) {
        elements.modalFavorite.querySelector('i').classList.toggle('far');
        elements.modalFavorite.querySelector('i').classList.toggle('fas');
        elements.modalFavorite.classList.toggle('text-yellow-400');
    }
    
    // Save to localStorage
    localStorage.setItem('unsplash-favorites', JSON.stringify(state.favorites));
    
    // Update UI if currently showing favorites
    if (state.showingFavorites) {
        showFavorites();
    }
}

// Show favorites
function showFavorites() {
    state.showingFavorites = true;
    elements.favoritesToggle.classList.add('bg-yellow-500');
    elements.favoritesToggle.classList.remove('bg-blue-500');
    elements.gallery.innerHTML = '';
    elements.loadMoreButton.classList.add('hidden');
    elements.galleryTitle.textContent = 'Your Favorites';
    elements.galleryDescription.textContent = `${state.favorites.length} photos in your collection`;
    
    if (state.favorites.length === 0) {
        elements.gallery.innerHTML = `
            <div class="col-span-full text-center py-10">
                <i class="far fa-star text-4xl text-gray-400 mb-3"></i>
                <p class="text-gray-500">No favorite photos yet. Browse and click the star icon to add favorites.</p>
            </div>
        `;
    } else {
        renderPhotos(state.favorites);
    }
}

// Show all photos (exit favorites mode)
function showAllPhotos() {
    state.showingFavorites = false;
    elements.favoritesToggle.classList.remove('bg-yellow-500');
    elements.favoritesToggle.classList.add('bg-blue-500');
    
    if (state.currentQuery) {
        searchPhotos(state.currentQuery, 1);
    } else {
        // Reset to first page
        state.currentPage = 1;
        fetchPopularPhotos();
    }
}

// Toggle favorites view
function toggleFavorites() {
    if (state.showingFavorites) {
        showAllPhotos();
    } else {
        showFavorites();
    }
}

// Open photo modal
function openPhotoModal(photo) {
    elements.modalImage.src = photo.urls.regular;
    elements.modalImage.dataset.id = photo.id;
    elements.modalUsername.textContent = photo.user.name;
    elements.modalUserImg.src = photo.user.profile_image.medium;
    elements.modalUserLink.textContent = `@${photo.user.username}`;
    elements.modalUserLink.href = `${photo.user.links.html}?utm_source=unsplash_gallery&utm_medium=referral`;
    elements.modalDate.textContent = new Date(photo.created_at).toLocaleDateString();
    elements.modalDescription.textContent = photo.description || photo.alt_description || '';
    elements.modalDownload.href = `${photo.links.download}&force=true`;
    
    // Check if photo is in favorites
    const isInFavorites = state.favorites.some(fav => fav.id === photo.id);
    elements.modalFavorite.querySelector('i').className = isInFavorites ? 'fas fa-star' : 'far fa-star';
    elements.modalFavorite.classList.toggle('text-yellow-400', isInFavorites);
    
    elements.photoModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

// Close photo modal
function closePhotoModal() {
    elements.photoModal.classList.add('hidden');
    document.body.style.overflow = '';
}

// Handle search
function handleSearch() {
    const query = elements.searchInput.value.trim();
    state.currentPage = 1;
    searchPhotos(query);
}

// Show loading indicator
function showLoading(show) {
    elements.loadingIndicator.classList.toggle('hidden', !show);
}

// Show error message
function showError(message) {
    const errorEl = document.createElement('div');
    errorEl.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-md z-50';
    errorEl.textContent = message;
    document.body.appendChild(errorEl);
    
    setTimeout(() => {
        errorEl.classList.add('opacity-0', 'transition-opacity');
        setTimeout(() => errorEl.remove(), 300);
    }, 3000);
}

// Update load more button visibility
function updateLoadMoreButton() {
    elements.loadMoreButton.classList.toggle('hidden', !state.hasMore);
}