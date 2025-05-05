// Unsplash API configuration
const UNSPLASH_API = {
    baseUrl: 'https://api.unsplash.com',
    // Replace this with your actual Unsplash API access key
    accessKey: 'm4Hw2hi9VD1ZJtrrf-lTxzxMKNkjgZh_pjKg4CDR8B0',
    perPage: 24 // Changed from 24 to 12 images per page
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
    tutorialOverlay: document.getElementById('tutorial-overlay'),
    tutorialBackdrop: document.getElementById('tutorial-backdrop'),
    tutorialContainer: document.getElementById('tutorial-container'),
    tutorialSteps: document.querySelectorAll('.tutorial-step'),
    tutorialSkip: document.querySelectorAll('.tutorial-skip'),
    tutorialNext: document.querySelectorAll('.tutorial-next'),
    tutorialBack: document.querySelectorAll('.tutorial-back'),
    tutorialFinish: document.querySelector('.tutorial-finish'),
    tutorialDontShow: document.getElementById('tutorial-dont-show'),
    dontShowTutorial: document.getElementById('dont-show-tutorial')
};

// User tags - these can be randomly assigned to users
const USER_TAGS = [
    'Team Pro Studio',
    'Official',
    'Verified',
    'Editor\'s Choice',
    'Featured Creator',
    'Top Contributor',
    'Premium',
    'Pro Photographer',
    'Ambassador',
    'Rising Talent'
];

// Generate a tag for a user based on their username and other properties
function getUserTag(user) {
    const hash = user.username.split('').reduce((acc, char) => {
        return ((acc << 5) - acc) + char.charCodeAt(0);
    }, 0);
    const tagIndex = Math.abs(hash) % USER_TAGS.length;
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
    currentFocusIndex: -1,
    suggestionFocusIndex: -1,
    currentTutorialStep: 1,
    isFirstVisit: !localStorage.getItem('tutorial-shown')
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

    document.addEventListener('keydown', handleKeyboardNavigation);
    elements.searchInput.addEventListener('keydown', handleSearchSuggestionNavigation);

    // Tutorial event listeners
    elements.tutorialSkip.forEach(btn => {
        btn.addEventListener('click', closeTutorial);
    });
    
    elements.tutorialNext.forEach(btn => {
        btn.addEventListener('click', nextTutorialStep);
    });
    
    elements.tutorialBack.forEach(btn => {
        btn.addEventListener('click', previousTutorialStep);
    });
    
    elements.tutorialFinish?.addEventListener('click', closeTutorial);
    
    elements.dontShowTutorial?.addEventListener('change', (e) => {
        if (e.target.checked) {
            localStorage.setItem('tutorial-shown', 'true');
        }
    });

    renderTrendingKeywords();
    fetchPopularPhotos();

    if (state.isFirstVisit) {
        setTimeout(() => {
            startTutorial();
        }, 1000);
    }
});

// Start tutorial for first-time users
function startTutorial() {
    elements.tutorialOverlay.classList.remove('hidden');
    elements.tutorialBackdrop.classList.remove('hidden');
    elements.tutorialDontShow.classList.remove('hidden');
    
    // Position and show the first step
    showTutorialStep(1);
}

// Show a specific tutorial step
function showTutorialStep(stepNumber) {
    // Hide all tutorial steps
    elements.tutorialSteps.forEach(step => step.classList.add('hidden'));
    
    // Show the current step
    const currentStep = document.getElementById(`tutorial-step-${stepNumber}`);
    if (currentStep) {
        currentStep.classList.remove('hidden');
        
        // Position the tutorial card based on the step
        positionTutorialCard(stepNumber);
    }
    
    state.currentTutorialStep = stepNumber;
}

// Position the tutorial card next to the relevant feature
function positionTutorialCard(stepNumber) {
    const currentStep = document.getElementById(`tutorial-step-${stepNumber}`);
    if (!currentStep) return;
    
    switch (stepNumber) {
        case 1:
            // Position near search bar
            const searchInput = elements.searchInput;
            const searchRect = searchInput.getBoundingClientRect();
            
            currentStep.style.top = `${searchRect.bottom + 10}px`;
            currentStep.style.left = `${searchRect.left}px`;
            break;
            
        case 2:
            // Position near favorites button
            const favBtn = elements.favoritesToggle;
            const favRect = favBtn.getBoundingClientRect();
            
            currentStep.style.top = `${favRect.bottom + 10}px`;
            currentStep.style.left = `${favRect.left - currentStep.offsetWidth/2 + favRect.width/2}px`;
            break;
            
        case 3:
            // Position near gallery
            const gallery = elements.gallery;
            const galleryRect = gallery.getBoundingClientRect();
            
            currentStep.style.top = `${galleryRect.top + 50}px`;
            currentStep.style.left = `${galleryRect.left + 50}px`;
            break;
    }
}

// Move to the next tutorial step
function nextTutorialStep() {
    if (state.currentTutorialStep < 3) {
        showTutorialStep(state.currentTutorialStep + 1);
    }
}

// Move to the previous tutorial step
function previousTutorialStep() {
    if (state.currentTutorialStep > 1) {
        showTutorialStep(state.currentTutorialStep - 1);
    }
}

// Close tutorial
function closeTutorial() {
    elements.tutorialOverlay.classList.add('hidden');
    elements.tutorialBackdrop.classList.add('hidden');
    elements.tutorialDontShow.classList.add('hidden');
    
    if (elements.dontShowTutorial.checked) {
        localStorage.setItem('tutorial-shown', 'true');
    }
}

// Handle keyboard navigation
function handleKeyboardNavigation(e) {
    if (e.key === 'Escape') {
        if (!elements.photoModal.classList.contains('hidden')) {
            closePhotoModal();
            return;
        }
        if (!elements.tutorialOverlay.classList.contains('hidden')) {
            closeTutorial();
            return;
        }
    }

    if (!elements.photoModal.classList.contains('hidden')) {
        if (e.key === 'f' || e.key === 'F') {
            const id = elements.modalImage.dataset.id;
            toggleFavoritePhoto(id);
            return;
        }
        if (e.key === 'd' || e.key === 'D') {
            elements.modalDownload.click();
            return;
        }
        return;
    }

    const imageCards = elements.gallery.querySelectorAll('.image-card');
    if (state.currentFocusIndex >= 0 && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        if (e.key === 'ArrowLeft') {
            state.currentFocusIndex = Math.max(0, state.currentFocusIndex - 1);
        } else {
            state.currentFocusIndex = Math.min(imageCards.length - 1, state.currentFocusIndex + 1);
        }
        focusImageCard(imageCards[state.currentFocusIndex]);
    }

    if (state.currentFocusIndex >= 0 && (e.key === 'f' || e.key === 'F')) {
        const focusedCard = imageCards[state.currentFocusIndex];
        const favoriteBtn = focusedCard.querySelector('.favorite-btn');
        if (favoriteBtn) {
            favoriteBtn.click();
        }
    }

    if (state.currentFocusIndex >= 0 && e.key === 'Enter') {
        const focusedCard = imageCards[state.currentFocusIndex];
        const img = focusedCard.querySelector('img');
        if (img) {
            const photoId = img.dataset.id;
            const photo = state.photos.find(p => p.id === photoId) || 
                          state.favorites.find(p => p.id === photoId);
            if (photo) {
                openPhotoModal(photo);
            }
        }
    }
}

// Focus an image card and show its info
function focusImageCard(card) {
    elements.gallery.querySelectorAll('.image-card').forEach(c => {
        c.classList.remove('ring-2', 'ring-blue-500');
        c.querySelector('.image-info')?.classList.add('opacity-0');
    });

    card.classList.add('ring-2', 'ring-blue-500');
    card.querySelector('.image-info')?.classList.remove('opacity-0');
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Handle search suggestion keyboard navigation
function handleSearchSuggestionNavigation(e) {
    const suggestions = elements.searchSuggestions.querySelectorAll('.cursor-pointer');

    if (suggestions.length === 0 || elements.searchSuggestions.classList.contains('hidden')) {
        return;
    }

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        state.suggestionFocusIndex = Math.min(suggestions.length - 1, state.suggestionFocusIndex + 1);
        updateSuggestionFocus(suggestions);
    }

    if (e.key === 'ArrowUp') {
        e.preventDefault();
        state.suggestionFocusIndex = Math.max(-1, state.suggestionFocusIndex - 1);
        updateSuggestionFocus(suggestions);

        if (state.suggestionFocusIndex === -1) {
            elements.searchInput.focus();
        }
    }

    if (e.key === 'Enter' && state.suggestionFocusIndex >= 0) {
        e.preventDefault();
        suggestions[state.suggestionFocusIndex].click();
    }
}

// Update suggestion focus
function updateSuggestionFocus(suggestions) {
    suggestions.forEach(s => s.classList.remove('bg-gray-100'));

    if (state.suggestionFocusIndex >= 0) {
        suggestions[state.suggestionFocusIndex].classList.add('bg-gray-100');
        suggestions[state.suggestionFocusIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Render trending keywords
function renderTrendingKeywords() {
    elements.trendingKeywords.innerHTML = '';
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

    if (state.debounceTimeout) {
        clearTimeout(state.debounceTimeout);
    }

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
        showSearchSuggestions(query);

        const url = `${UNSPLASH_API.baseUrl}/search/photos?query=${encodeURIComponent(query)}&per_page=5`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Client-ID ${UNSPLASH_API.accessKey}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch suggestions');

        const data = await response.json();

        if (data.results && data.results.length > 0) {
            const tags = new Set();

            data.results.forEach(photo => {
                if (photo.tags && photo.tags.length) {
                    photo.tags.forEach(tag => {
                        if (tag.title) {
                            tags.add(tag.title);
                        }
                    });
                }
            });

            if (tags.size < 3 && data.results[0].alt_description) {
                const words = data.results[0].alt_description.split(' ');
                words.forEach(word => {
                    if (word.length > 4) tags.add(word);
                });
            }

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
    state.suggestionFocusIndex = -1;

    let filteredHistory = searchHistory;
    if (typeof query === 'string' && query.length > 0) {
        filteredHistory = searchHistory.filter(term => 
            term.toLowerCase().includes(query.toLowerCase())
        );
    }

    if (filteredHistory.length > 0) {
        appendSearchSuggestions(filteredHistory.slice(-5).reverse(), 'Recent Searches');
    }

    if (elements.searchSuggestions.children.length === 0) {
        elements.searchSuggestions.classList.add('hidden');
    } else {
        elements.searchSuggestions.classList.remove('hidden');
    }
}

// Append search suggestions to the container
function appendSearchSuggestions(suggestions, sectionTitle) {
    if (!suggestions || suggestions.length === 0) return;

    if (sectionTitle) {
        const title = document.createElement('div');
        title.className = 'text-xs text-gray-500 px-4 py-1 bg-gray-100';
        title.textContent = sectionTitle;
        elements.searchSuggestions.appendChild(title);
    }

    suggestions.forEach((term, index) => {
        const item = document.createElement('div');
        item.className = 'px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center';
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', 'false');
        item.setAttribute('tabindex', '0');

        const icon = document.createElement('i');
        icon.className = 'fas fa-search text-gray-400 mr-2 text-sm';
        icon.setAttribute('aria-hidden', 'true');

        const text = document.createElement('span');
        text.textContent = term;

        item.appendChild(icon);
        item.appendChild(text);

        item.addEventListener('click', () => {
            elements.searchInput.value = term;
            handleSearch();
        });

        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                elements.searchInput.value = term;
                handleSearch();
            }
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

    if (page === 1 && !searchHistory.includes(query)) {
        searchHistory.push(query);
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
        return;
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

    photos.forEach((photo, index) => {
        const isInFavorites = state.favorites.some(fav => fav.id === photo.id);
        const userTag = getUserTag(photo.user);
        const imageName = photo.description || photo.alt_description || 'Untitled Image';

        const article = document.createElement('article');
        article.className = 'image-card';
        article.setAttribute('tabindex', '0');
        article.setAttribute('role', 'button');
        article.setAttribute('aria-label', `Photo by ${photo.user.name}: ${imageName}`);

        article.innerHTML = `
            <div class="relative">
                <img src="${photo.urls.small}" 
                    alt="${photo.alt_description || 'Photo by ' + photo.user.name}" 
                    class="w-full cursor-pointer"
                    data-id="${photo.id}" 
                    data-full="${photo.urls.full}">
                
                <div class="image-info pointer-events-none">
                    <h3 class="text-white text-sm font-medium truncate mb-2">${imageName}</h3>
                    <div class="flex items-center justify-between">
                        <div class="profile-section pointer-events-auto rounded-full py-1 px-3 bg-black bg-opacity-50 backdrop-blur">
                            <div class="flex items-center gap-2">
                                <span class="profile-name text-white text-xs">${photo.user.name}</span>
                                <span class="profile-divider text-gray-400">•</span>
                                <span class="profile-tag text-gray-300 text-xs">${userTag}</span>
                            </div>
                        </div>
                        <button class="favorite-btn pointer-events-auto ${isInFavorites ? 'active' : ''}" 
                            data-id="${photo.id}"
                            aria-label="${isInFavorites ? 'Remove from favorites' : 'Add to favorites'}"
                            aria-pressed="${isInFavorites}">
                            <i class="fas fa-heart" aria-hidden="true"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        elements.gallery.appendChild(article);

        const img = article.querySelector('img');
        img.addEventListener('click', () => {
            openPhotoModal(photo);
        });

        article.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                openPhotoModal(photo);
            } else if (e.key === 'f' || e.key === 'F') {
                toggleFavoritePhoto(photo.id);
            }
        });

        article.addEventListener('focus', () => {
            state.currentFocusIndex = index;
        });

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

    const favBtns = document.querySelectorAll(`.favorite-btn[data-id="${photoId}"]`);
    favBtns.forEach(btn => {
        btn.classList.toggle('active');
        btn.setAttribute('aria-label', isInFavorites ? 'Add to favorites' : 'Remove from favorites');
        btn.setAttribute('aria-pressed', !isInFavorites);
    });

    if (elements.modalImage.dataset.id === photoId) {
        elements.modalFavorite.querySelector('i').classList.toggle('far');
        elements.modalFavorite.querySelector('i').classList.toggle('fas');
        elements.modalFavorite.classList.toggle('text-yellow-400');
    }

    localStorage.setItem('unsplash-favorites', JSON.stringify(state.favorites));

    if (state.showingFavorites) {
        showFavorites();
    }
}

// Show favorites
function showFavorites() {
    state.showingFavorites = true;
    // Keep background black but add active class to style the heart icon
    elements.favoritesToggle.classList.add('active');
    elements.gallery.innerHTML = '';
    elements.loadMoreButton.classList.add('hidden');
    elements.galleryTitle.textContent = 'Your Favorites';
    elements.galleryDescription.textContent = `${state.favorites.length} photos in your collection`;

    if (state.favorites.length === 0) {
        elements.gallery.innerHTML = `
            <div class="col-span-full text-center py-10">
                <i class="far fa-heart text-4xl text-gray-400 mb-3"></i>
                <p class="text-gray-500">No favorite photos yet. Browse and click the heart icon to add favorites.</p>
            </div>
        `;
    } else {
        renderPhotos(state.favorites);
    }
}

// Show all photos (exit favorites mode)
function showAllPhotos() {
    state.showingFavorites = false;
    // Remove active class when not showing favorites
    elements.favoritesToggle.classList.remove('active');

    if (state.currentQuery) {
        searchPhotos(state.currentQuery, 1);
    } else {
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

    if (document.getElementById('modal-user-tag')) {
        document.getElementById('modal-user-tag').textContent = userTag;
    } else {
        const tagSpan = document.createElement('span');
        tagSpan.id = 'modal-user-tag';
        tagSpan.className = 'text-xs text-gray-500 block mt-1';
        tagSpan.textContent = userTag;
        elements.modalUsername.parentNode.appendChild(tagSpan);
    }

    const isInFavorites = state.favorites.some(fav => fav.id === photo.id);
    elements.modalFavorite.querySelector('i').className = isInFavorites ? 'fas fa-heart' : 'far fa-heart';
    elements.modalFavorite.classList.toggle('text-red-500', isInFavorites);

    elements.photoModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // Add event listener to close when clicking outside the modal content
    setTimeout(() => {
        elements.photoModal.addEventListener('click', closeModalOnOutsideClick);
    }, 100);
}

// Close modal when clicking outside
function closeModalOnOutsideClick(e) {
    const modalContainer = document.querySelector('.modal-container');
    if (e.target !== modalContainer && !modalContainer.contains(e.target)) {
        closePhotoModal();
    }
}

// Close photo modal
function closePhotoModal() {
    elements.photoModal.classList.add('hidden');
    document.body.style.overflow = '';
    // Remove the outside click event listener to avoid memory leaks
    elements.photoModal.removeEventListener('click', closeModalOnOutsideClick);
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