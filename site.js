/**
 * Turkish Clothing Store - Mobile Web App
 * Main JavaScript file
 */
import { BrowserMultiFormatReader } from 'https://cdn.jsdelivr.net/npm/@zxing/library@latest/+esm';

// State Management
const state = {
  appData: null,
  products: [],
  selectedProduct: null,
  isLoading: true,
  isModalOpen: false,
  isScanning: false,
  stream: null
};

// DOM Elements
const elements = {
  appTitle: document.getElementById('app-title'),
  appDesc: document.getElementById('app-desc'),
  productList: document.getElementById('product-list'),
  productModal: document.getElementById('product-modal'),
  modalOverlay: document.getElementById('modal-overlay'),
  closeModalBtn: document.getElementById('close-modal'),
  modalProductName: document.getElementById('modal-product-name'),
  modalProductImage: document.getElementById('modal-product-image'),
  modalProductPrice: document.getElementById('modal-product-price'),
  modalProductBarcode: document.getElementById('modal-product-barcode'),
  modalProductDesc: document.getElementById('modal-product-desc'),
  videoTitle: document.getElementById('video-title'),
  videoPlaceholder: document.getElementById('video-placeholder'),
  videoPlayButton: document.getElementById('video-play-button'),
  videoIframeContainer: document.getElementById('video-iframe-container'),
  scanButton: document.getElementById('scan-button'),
  scannerUI: document.getElementById('scanner-ui'),
  scannerVideo: document.getElementById('scanner-video'),
  closeScannerBtn: document.getElementById('close-scanner')
};

// Utility Functions
const utils = {
  /**
   * Fetch JSON data from a file
   * @param {string} url - Path to the JSON file
   * @returns {Promise<Object>} - JSON data
   */
  async fetchJSON(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching data:', error);
      return null;
    }
  },

  /**
   * Create an HTML element with attributes and content
   * @param {string} tag - HTML tag name
   * @param {Object} attributes - Element attributes
   * @param {string|Node} content - Element content
   * @returns {HTMLElement} - Created HTML element
   */
  createElement(tag, attributes = {}, content = '') {
    const element = document.createElement(tag);
    
    // Set attributes
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
    
    // Set content
    if (typeof content === 'string') {
      element.innerHTML = content;
    } else if (content instanceof Node) {
      element.appendChild(content);
    }
    
    return element;
  },

  /**
   * Animate an element with a class and remove it after animation
   * @param {HTMLElement} element - Element to animate
   * @param {string} className - Animation class name
   */
  animateElement(element, className) {
    element.classList.add(className);
    element.addEventListener('animationend', () => {
      element.classList.remove(className);
    }, { once: true });
  }
};

// Scanner Controller
const scanner = {
  async init() {
    try {
      // Removed BarcodeDetector API usage as it is not working
      // if (!('BarcodeDetector' in window)) {
      //   throw new Error('Barcode Detection API is not supported');
      // }

      elements.scanButton.addEventListener('click', this.startScanning.bind(this));
      elements.closeScannerBtn.addEventListener('click', this.stopScanning.bind(this));
    } catch (error) {
      console.error('Scanner initialization error:', error);
      elements.scanButton.style.display = 'none';
    }
  },

  async startScanning() {
    try {
      state.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      elements.scannerVideo.srcObject = state.stream;
      elements.scannerUI.classList.remove('hidden');
      state.isScanning = true;

      const codeReader = new BrowserMultiFormatReader();

      codeReader.decodeFromVideoDevice(null, elements.scannerVideo, (result, err) => {
        if (result) {
          console.log(result.getText()); // Replace with desired action for the result
          const barcode = result.getText();
          stopScanning();
          const product = state.products.find(p => p.barcode === barcode);
          openProductModal(product)
        }
        if (err && (err.message !== 'No MultiFormat Readers were able to detect the code.' )) {
          console.error(err);
        }
      });
    } catch (error) {
      console.error('Error starting scanner:', error);
      alert('Kamera erişimi sağlanamadı. Lütfen kamera izinlerini kontrol edin.');
    }
  },

  stopScanning() {
    if (state.stream) {
      state.stream.getTracks().forEach(track => track.stop());
      state.stream = null;
    }
    
    elements.scannerUI.classList.add('hidden');
    elements.scannerVideo.srcObject = null;
    state.isScanning = false;
  }
};

// App Controller
const app = {
  /**
   * Initialize the application
   */
  async init() {
    try {
      // Fetch data from data.json
      state.appData = await utils.fetchJSON('data.json');
      if (!state.appData) {
        throw new Error('Failed to load application data');
      }
      
      // Set app title and description
      elements.appTitle.textContent = state.appData.app.title;
      elements.appDesc.textContent = state.appData.app.desc;
      document.title = state.appData.app.title;
      
      // Store products in state
      state.products = state.appData.data.products;
      
      // Initialize scanner
      await scanner.init();
      
      // Render product list
      this.renderProductList();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Mark as loaded
      state.isLoading = false;
      
    } catch (error) {
      console.error('Application initialization error:', error);
      elements.productList.innerHTML = `
        <div class="error-message">
          <p>Veri yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.</p>
        </div>
      `;
    }
  },
  
  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Close modal when clicking on overlay or close button
    elements.modalOverlay.addEventListener('click', this.closeModal.bind(this));
    elements.closeModalBtn.addEventListener('click', this.closeModal.bind(this));
    
    // Close modal when pressing escape key
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && state.isModalOpen) {
        this.closeModal();
      }
    });
    
    // Video player functionality
    elements.videoPlayButton.addEventListener('click', this.playVideo.bind(this));
    
    // Prevent scrolling when modal is open
    elements.productModal.addEventListener('touchmove', (event) => {
      if (!elements.modalContainer.contains(event.target)) {
        event.preventDefault();
      }
    }, { passive: false });
  },
  
  /**
   * Render the product list
   */
  renderProductList() {
    // Clear loading indicator
    elements.productList.innerHTML = '';
    
    // Create product cards
    state.products.forEach(product => {
      const productCard = utils.createElement('div', {
        class: 'product-card',
        'data-barcode': product.barcode
      });
      
      // Create product image
      const productImage = utils.createElement('img', {
        src: product.photo1,
        alt: product.name,
        loading: 'lazy'
      });
      
      // Create product content
      const productContent = utils.createElement('div', {
        class: 'product-card-content'
      });
      
      // Create product name
      const productName = utils.createElement('h3', {}, product.name);
      
      // Create product price
      const productPrice = utils.createElement('div', {
        class: 'product-card-price'
      }, product.price);
      
      // Assemble product card
      productContent.appendChild(productName);
      productContent.appendChild(productPrice);
      productCard.appendChild(productImage);
      productCard.appendChild(productContent);
      
      // Add click event listener
      productCard.addEventListener('click', () => {
        this.openProductModal(product);
      });
      
      // Add to product list
      elements.productList.appendChild(productCard);
      
      // Animate entry
      utils.animateElement(productCard, 'fade-in');
    });
  },
  
  /**
   * Open product modal with selected product
   * @param {Object} product - Selected product
   */
  openProductModal(product) {
    // Store selected product
    state.selectedProduct = product;
    
    // Set modal content
    elements.modalProductName.textContent = product.name;
    elements.modalProductImage.src = product.photo1;
    elements.modalProductImage.alt = product.name;
    elements.modalProductPrice.textContent = product.price;
    elements.modalProductBarcode.textContent = `Barkod: ${product.barcode}`;
    elements.modalProductDesc.textContent = product.desc;
    
    // Set video details
    elements.videoTitle.textContent = product.video1;
    
    // Reset video container
    elements.videoPlaceholder.style.display = 'flex';
    elements.videoIframeContainer.innerHTML = '';
    elements.videoIframeContainer.classList.add('hidden');
    
    // Open modal
    elements.productModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    state.isModalOpen = true;
    
    // Animate modal entry
    utils.animateElement(elements.modalProductImage, 'fade-in');
  },
  
  /**
   * Close the product modal
   */
  closeModal() {
    // Hide modal
    elements.productModal.classList.remove('active');
    document.body.style.overflow = '';
    state.isModalOpen = false;
    
    // Stop video if playing
    elements.videoIframeContainer.innerHTML = '';
  },
  
  /**
   * Play the product video
   */
  playVideo() {
    if (!state.selectedProduct || !state.selectedProduct.videoUrl1) {
      return;
    }
    
    // Create iframe for YouTube video
    const iframe = utils.createElement('iframe', {
      src: `${state.selectedProduct.videoUrl1}?autoplay=1&rel=0`,
      title: state.selectedProduct.video1,
      frameborder: '0',
      allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
      allowfullscreen: ''
    });
    
    // Add iframe to container
    elements.videoIframeContainer.innerHTML = '';
    elements.videoIframeContainer.appendChild(iframe);
    
    // Hide placeholder and show iframe
    elements.videoPlaceholder.style.display = 'none';
    elements.videoIframeContainer.classList.remove('hidden');
  }
};

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});

// Add touch-friendly enhancements for mobile
document.addEventListener('touchstart', () => {}, { passive: true });