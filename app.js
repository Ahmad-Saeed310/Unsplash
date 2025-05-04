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
    modalDescription: document.getElementById('modal-description'),
    trendingKeywords: document.getElementById('trending-keywords'),
    searchSuggestions: document.getElementById('search-suggestions'),
    voiceSearchButton: document.getElementById('voice-search-button')
};

// User tags - these can be randomly assigned to users
const USER_TAGS = [
    'Studio',
    'Official',
    'Verified',
    'Premium',
    'ProPhotographer',
    'Ambassador',
    'RisingTalent'
];

// Generate a tag for a user based on their username and other properties
function getUserTag(user) {
    // Use a hash function based on username to consistently assign the same tag to the same user
    const hash = user.username.split('').reduce((acc, char) => {
        return ((acc << 5) - acc) + char.charCodeAt(0);
    }, 0);
    
    // Use the hash to select a tag (ensures the same user always gets the same tag)
    const tagIndex = Math.abs(hash) % USER_TAGS.length;
    
    // Return the selected tag
    return USER_TAGS[tagIndex];
}

// Trending keywords (these can be updated based on your audience/preference)
const TRENDING_KEYWORDS = [
    'nature', 'travel', 'landscape', 'food', 'architecture', 
    'minimal', 'technology', 'animals', 'black and white', 'abstract',
    'portrait', 'fashion', 'business', 'wallpaper', 'gradient'
];

// Search history from localStorage
let searchHistory = JSON.parse(localStorage.getItem('unsplash-search-history') || '[]');

// State variables
let state = {
    photos: [],
    currentPage: 1,
    currentQuery: '',
    hasMore: false,
    showingFavorites: false,
    favorites: JSON.parse(localStorage.getItem('unsplash-favorites') || '[]'),
    debounceTimeout: null,
    isListening: false,
    recognition: null
};

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    elements.searchButton.addEventListener('click', handleSearch);
    elements.searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') handleSearch();
        else handleSearchInput(e);
    });
    elements.searchInput.addEventListener('focus', showSearchSuggestions);
    document.addEventListener('click', (e) => {
        if (!elements.searchInput.contains(e.target) && 
            !elements.searchSuggestions.contains(e.target)) {
            elements.searchSuggestions.classList.add('hidden');
        }
    });
    elements.loadMoreButton.addEventListener('click', loadMorePhotos);
    elements.favoritesToggle.addEventListener('click', toggleFavorites);
    elements.closeModal.addEventListener('click', closePhotoModal);
    elements.modalFavorite.addEventListener('click', () => {
        const id = elements.modalImage.dataset.id;
        toggleFavoritePhoto(id);
    });

    // Set up voice search if supported
    setupVoiceSearch();

    // Load trending keywords
    renderTrendingKeywords();

    // Load initial photos
    fetchPopularPhotos();
});

// Set up voice search functionality
function setupVoiceSearch() {
    // Check if browser supports speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        // Initialize speech recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        state.recognition = new SpeechRecognition();
        state.recognition.continuous = false;
        state.recognition.interimResults = false;
        state.recognition.lang = 'en-US'; // Set language to English
        
        // Add event listener for voice search button
        elements.voiceSearchButton.addEventListener('click', toggleVoiceInput);
        
        // Handle recognition results
        state.recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            elements.searchInput.value = transcript;
            handleSearch();
            stopVoiceInput();
        };
        
        // Handle recognition end
        state.recognition.onend = function() {
            stopVoiceInput();
        };
        
        // Handle recognition errors
        state.recognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
            showError('Voice input error. Please try again.');
            stopVoiceInput();
        };
    } else {
        // Hide voice search button if not supported
        elements.voiceSearchButton.style.display = 'none';
        console.log('Speech recognition not supported in this browser');
    }
}

// Toggle voice input on/off
function toggleVoiceInput() {
    if (state.isListening) {
        stopVoiceInput();
    } else {
        startVoiceInput();
    }
}

// Start voice input
function startVoiceInput() {
    if (state.recognition) {
        try {
            state.recognition.start();
            state.isListening = true;
            elements.voiceSearchButton.classList.add('text-red-500');
            elements.voiceSearchButton.classList.remove('text-gray-500');
            elements.searchInput.placeholder = 'Listening...';
            
            // Create and show a listening indicator
            showListeningIndicator();
        } catch (error) {
            console.error('Could not start speech recognition:', error);
            showError('Could not start voice input');
        }
    }
}

// Stop voice input
function stopVoiceInput() {
    if (state.recognition) {
        try {
            state.recognition.stop();
        } catch (e) {
            // Ignore errors on stop
        }
        state.isListening = false;
        elements.voiceSearchButton.classList.remove('text-red-500');
        elements.voiceSearchButton.classList.add('text-gray-500');
        elements.searchInput.placeholder = 'Search photos...';
        
        // Remove listening indicator
        hideListeningIndicator();
    }
}

// Show a visual indicator that the app is listening
function showListeningIndicator() {
    // Check if indicator already exists
    let indicator = document.getElementById('voice-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'voice-indicator';
        indicator.className = 'absolute left-5 top-0 bottom-0 flex items-center animate-pulse';
        
        // Create wave animation for the indicator
        const waves = document.createElement('div');
        waves.className = 'flex items-center space-x-1';
        waves.innerHTML = `
            <div class="w-1 h-2 bg-red-500 rounded"></div>
            <div class="w-1 h-3 bg-red-500 rounded"></div>
            <div class="w-1 h-4 bg-red-500 rounded"></div>
            <div class="w-1 h-3 bg-red-500 rounded"></div>
            <div class="w-1 h-2 bg-red-500 rounded"></div>
        `;
        
        indicator.appendChild(waves);
        elements.searchInput.parentNode.appendChild(indicator);
    }
}

// Hide the listening indicator
function hideListeningIndicator() {
    const indicator = document.getElementById('voice-indicator');
    if (indicator) {
        indicator.remove();
    }
}

// Render trending keywords
function renderTrendingKeywords() {
    elements.trendingKeywords.innerHTML = '';
    
    // Get random subset of trending keywords (8 keywords)
    const shuffled = [...TRENDING_KEYWORDS].sort(() => 0.5 - Math.random());
    const selectedKeywords = shuffled.slice(0, 8);
    
    selectedKeywords.forEach(keyword => {
        const tag = document.createElement('span');
        tag.className = 'trending-tag text-[vh] px-3 py-1 border-bg-stone-300  text-black rounded-full text-sm cursor-pointer hover:bg-stone-200';
        tag.textContent = keyword;
        tag.addEventListener('click', () => {
            elements.searchInput.value = keyword;
            handleSearch();
        });
        elements.trendingKeywords.appendChild(tag);
    });
}

// Handle search input for suggestions
function handleSearchInput(e) {
    const query = e.target.value.trim();
    
    // Clear previous timeout
    if (state.debounceTimeout) {
        clearTimeout(state.debounceTimeout);
    }
    
    // Debounce input to avoid excessive API calls
    if (query.length >= 2) {
        state.debounceTimeout = setTimeout(() => {
            fetchSearchSuggestions(query);
        }, 300);
    } else {
        elements.searchSuggestions.classList.add('hidden');
    }
}

// Fetch search suggestions
async function fetchSearchSuggestions(query) {
    try {
        // First, check and show search history matches
        showSearchSuggestions(query);
        
        // Then try to get suggestions from API if available
        const url = `${UNSPLASH_API.baseUrl}/search/photos?query=${encodeURIComponent(query)}&per_page=5`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Client-ID ${UNSPLASH_API.accessKey}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch suggestions');
        
        const data = await response.json();
        
        // Extract tags/related terms if available in the API response
        if (data.results && data.results.length > 0) {
            const tags = new Set();
            
            // Extract tags from results
            data.results.forEach(photo => {
                if (photo.tags && photo.tags.length) {
                    photo.tags.forEach(tag => {
                        if (tag.title) {
                            tags.add(tag.title);
                        }
                    });
                }
            });
            
            // Add related suggestions based on photo descriptions/alt
            if (tags.size < 3 && data.results[0].alt_description) {
                const words = data.results[0].alt_description.split(' ');
                words.forEach(word => {
                    if (word.length > 4) tags.add(word);
                });
            }
            
            // Add API suggestions to the suggestions list
            if (tags.size > 0) {
                const apiSuggestions = Array.from(tags).slice(0, 5);
                appendSearchSuggestions(apiSuggestions, 'API Suggestions');
            }
        }
    } catch (error) {
        console.error('Error fetching search suggestions:', error);
    }
}

// Show search suggestions based on history
function showSearchSuggestions(query = '') {
    elements.searchSuggestions.innerHTML = '';
    
    // We're no longer showing recent searches, only API-based suggestions
    // These will be added by fetchSearchSuggestions()
    
    // If this is called directly without a query, hide suggestions
    if (!query) {
        elements.searchSuggestions.classList.add('hidden');
    }
}

// Append search suggestions to the container
function appendSearchSuggestions(suggestions, sectionTitle) {
    if (!suggestions || suggestions.length === 0) return;
    
    // Add section title if provided
    if (sectionTitle) {
        const title = document.createElement('div');
        title.className = 'text-xs text-gray-500 px-4 py-1 bg-gray-100';
        title.textContent = sectionTitle;
        elements.searchSuggestions.appendChild(title);
    }
    
    // Add each suggestion
    suggestions.forEach(term => {
        const item = document.createElement('div');
        item.className = 'px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center';
        
        const icon = document.createElement('i');
        icon.className = 'fas fa-search text-gray-400 mr-2 text-sm';
        
        const text = document.createElement('span');
        text.textContent = term;
        
        item.appendChild(icon);
        item.appendChild(text);
        
        item.addEventListener('click', () => {
            elements.searchInput.value = term;
            handleSearch();
        });
        
        elements.searchSuggestions.appendChild(item);
    });
}

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
    
    // Add to search history if it's a new search term
    if (page === 1 && !searchHistory.includes(query)) {
        searchHistory.push(query);
        // Keep only the most recent 20 searches
        if (searchHistory.length > 20) {
            searchHistory.shift();
        }
        localStorage.setItem('unsplash-search-history', JSON.stringify(searchHistory));
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
        elements.searchSuggestions.classList.add('hidden');
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
        const userTag = getUserTag(photo.user);
        // Get the image name (use description, alt description, or a fallback)
        const imageName = photo.description || photo.alt_description || 'Untitled Image';
        
        const article = document.createElement('article');
        article.className = 'image-card';
        
        article.innerHTML = `
            <div class="relative">
                <img src="${photo.urls.small}" 
                    alt="${photo.alt_description || 'Unsplash photo'}" 
                    class="w-full cursor-pointer"
                    data-id="${photo.id}" 
                    data-full="${photo.urls.full}">
                
                <div class="image-info pointer-events-none">
                    <h3 class="text-white text-sm font-medium truncate mb-2">${imageName}</h3>
                    <div class="flex items-center justify-between">
                        <div class="profile-section pointer-events-none">
                            <img src="${photo.user.profile_image.small}" alt="${photo.user.name}" class="profile-image">
                            <div class="profile-info">
                                <h4 class="profile-name">${photo.user.name}</h4>
                                <span class="profile-tag">${userTag}</span>
                            </div>
                        </div>
                        <button class="favorite-btn bg-black bg-opacity-30 rounded-full p-2 text-lg shadow-sm hover:bg-opacity-50 transition-all pointer-events-auto ${isInFavorites ? 'active' : ''}" 
                            data-id="${photo.id}">
                            <i class="fas fa-heart ${isInFavorites ? 'text-pink-500' : 'text-white'}"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        elements.gallery.appendChild(article);
        
        // Add click event to open modal - attach directly to the entire card
        article.addEventListener('click', (e) => {
            // Only open modal if not clicking favorite button
            if (!e.target.closest('.favorite-btn')) {
                openPhotoModal(photo);
            }
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
    
    // Log for debugging
    console.log('Toggle favorite:', photoId, 'Is now favorite:', !isInFavorites);
    
    // Update UI - fix heart icon color and active state
    const favBtns = document.querySelectorAll(`.favorite-btn[data-id="${photoId}"]`);
    favBtns.forEach(btn => {
        btn.classList.toggle('active');
        const heartIcon = btn.querySelector('i.fas.fa-heart');
        if (!isInFavorites) { // Adding to favorites
            heartIcon.style.color = 'rgb(255, 36, 91)';
        } else { // Removing from favorites
            heartIcon.style.color = 'white';
        }
    });
    
    // Update modal if open
    if (elements.modalImage && elements.modalImage.dataset.id === photoId) {
        const modalIcon = elements.modalFavorite.querySelector('i');
        if (!isInFavorites) {
            modalIcon.className = 'fas fa-heart';
            modalIcon.style.color = 'rgb(255, 36, 91)';
        } else {
            modalIcon.className = 'far fa-heart';
            modalIcon.style.color = '';
        }
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
    elements.favoritesToggle.classList.add('bg-red-500');
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
    elements.favoritesToggle.classList.remove('bg-red-500');
    elements.favoritesToggle.classList.add('bg-black');
    
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
    const userTag = getUserTag(photo.user);
    
    elements.modalImage.src = photo.urls.regular;
    elements.modalImage.dataset.id = photo.id;
    elements.modalUsername.textContent = photo.user.name;
    elements.modalUserImg.src = photo.user.profile_image.medium;
    elements.modalUserLink.textContent = `@${photo.user.username}`;
    elements.modalUserLink.href = `${photo.user.links.html}?utm_source=unsplash_gallery&utm_medium=referral`;
    elements.modalDate.textContent = new Date(photo.created_at).toLocaleDateString();
    elements.modalDescription.textContent = photo.description || photo.alt_description || '';
    elements.modalDownload.href = `${photo.links.download}&force=true`;
    
    // Add user tag to modal
    if (document.getElementById('modal-user-tag')) {
        document.getElementById('modal-user-tag').textContent = userTag;
    } else {
        const tagSpan = document.createElement('span');
        tagSpan.id = 'modal-user-tag';
        tagSpan.className = 'text-xs text-gray-500 block mt-1';
        tagSpan.textContent = userTag;
        elements.modalUsername.parentNode.appendChild(tagSpan);
    }
    
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