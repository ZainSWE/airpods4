import * as THREE from 'https://esm.sh/three@0.128.0';
import { OrbitControls } from 'https://esm.sh/three@0.128.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://esm.sh/three@0.128.0/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'https://esm.sh/three@0.128.0/examples/jsm/environments/RoomEnvironment.js';
import CanvasScrollClip from 'https://esm.sh/canvas-scroll-clip';

let isMobile = window.innerWidth <= 1200;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(15, window.innerWidth / window.innerHeight, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ 
    alpha: true, 
    antialias: true,
    powerPreference: "high-performance",
    stencil: false,
    depth: true
});
let controls;
let object;
let mixer;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let isOverModel = false;
let isDragging = false;

const featureBackground = document.querySelector('.featureSectionBackground');
const scrollText = document.querySelector('.scrollText');
const featureSections = document.querySelectorAll('.featureSection');
const scrollContainer = document.querySelector('.scrollContainer');
const scrollContainer2 = document.querySelector('.scrollContainer2');

let featureSection2;

let lastScrollPos = 0;
let pixelsPerSection = 200;

let canvasScrollClipInstance = null;
let canvasScrollClipInstance2 = null;
let currentIsMobile = window.innerWidth <= 1200;

const clock = new THREE.Clock();

let loadingProgress = {
    model: false,
    canvas1: false,
    canvas2: false,
    images: false
};

let hotspots = [];
let hotspotsVisible = false;

function setSectionDuration(seconds) {
    const scrollSpeed = 100;
    pixelsPerSection = scrollSpeed * seconds;
    console.log(`Section duration set to ${seconds} seconds`);
}

setSectionDuration(8);

function checkAllLoaded() {
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        const total = 4;
        let loaded = 0;
        
        if (loadingProgress.model) loaded++;
        if (loadingProgress.canvas1) loaded++;
        if (loadingProgress.canvas2) loaded++;
        if (loadingProgress.images) loaded++;
        
        const percentage = (loaded / total) * 100;
        progressBar.style.width = percentage + '%';
    }
    
    const allLoaded = loadingProgress.model && 
                      loadingProgress.canvas1 && 
                      loadingProgress.canvas2 && 
                      loadingProgress.images;
    
    if (allLoaded) {
        console.log('All content loaded!');
        hideLoadingScreen();
    }
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.classList.add('loaded');
        setTimeout(function() {
            loadingScreen.remove();
            triggerTextAnimations();
        }, 800);
    }
}

function triggerTextAnimations() {
    const hero = document.querySelector('.hero');
    if (hero) {
        hero.classList.add('animate-in');
    }
}

function preloadImages() {
    const isMobileNow = window.innerWidth <= 1200;
    const frameCount1 = 120;
    const frameCount2 = 80;
    
    const basePath1 = isMobileNow ? "assets/images/framesMobile/" : "assets/images/frames/";
    const basePath2 = isMobileNow ? "assets/images/frames2Mobile/" : "assets/images/frames2/";
    
    let loadedImages = 0;
    let failedImages = 0;
    const totalImages = frameCount1 + frameCount2;
    
    function imageLoaded(src, success) {
        if (success) {
            loadedImages++;
            console.log(`Loaded: ${src}`);
        } else {
            failedImages++;
            console.error(`Failed: ${src}`);
        }
        
        console.log(`Progress: ${loadedImages + failedImages}/${totalImages} (${failedImages} failed)`);
        
        if (loadedImages + failedImages === totalImages) {
            if (failedImages > 0) {
                console.warn(`Image loading completed with ${failedImages} failed images`);
            }
            loadingProgress.images = true;
            checkAllLoaded();
        }
    }
    
    for (let i = 1; i <= frameCount1; i++) {
        const img = new Image();
        const frameNum = String(i).padStart(4, '0');
        const src = basePath1 + frameNum + '.webp';
        
        img.onload = function() {
            imageLoaded(src, true);
        };
        
        img.onerror = function() {
            imageLoaded(src, false);
        };
        
        img.src = src;
    }
    
    for (let i = 1; i <= frameCount2; i++) {
        const img = new Image();
        const frameNum = String(i).padStart(4, '0');
        const src = basePath2 + frameNum + '.webp';
        
        img.onload = function() {
            imageLoaded(src, true);
        };
        
        img.onerror = function() {
            imageLoaded(src, false);
        };
        
        img.src = src;
    }
}

function updateLoadingProgress() {
    const progressBar = document.getElementById('progressBar');
    if (!progressBar) return;
    
    const total = 4;
    let loaded = 0;
    
    if (loadingProgress.model) loaded++;
    if (loadingProgress.canvas1) loaded++;
    if (loadingProgress.canvas2) loaded++;
    if (loadingProgress.images) loaded++;
    
    const percentage = (loaded / total) * 100;
    progressBar.style.width = percentage + '%';
}

function loadModel() {
    const loader = new GLTFLoader();
    
    console.log('Starting GLB model preload...');
    
    loader.load(
        'assets/models/airpods.glb',
        function(gltf) {
            object = gltf.scene;
            object.scale.set(5, 5, 5);
            object.rotation.set(Math.PI / 10, 0, -6.5);
            
            object.traverse(function(child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            scene.add(object);
            
            if (gltf.animations && gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(object);
                gltf.animations.forEach(function(clip) {
                    mixer.clipAction(clip).play();
                });
            }
            
            console.log('3D Model loaded successfully');
            loadingProgress.model = true;
            checkAllLoaded();
        },
        function(xhr) {
            const percentComplete = (xhr.loaded / xhr.total * 100).toFixed(2);
            console.log(`Model loading: ${percentComplete}%`);
        },
        function(error) {
            console.error('Error loading model:', error);
            loadingProgress.model = true;
            checkAllLoaded();
        }
    );
}

function setupRenderer() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.5;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.enabled = !isMobile;
    renderer.setPixelRatio(isMobile ? 2 : Math.min(window.devicePixelRatio, 3));
    
    const canvas = renderer.domElement;
    canvas.style.transform = 'translateZ(0)';
    canvas.style.willChange = 'transform';
    
    document.getElementById("container3D").appendChild(canvas);
}

function setupControls() {
    controls = new OrbitControls(camera, renderer.domElement);
    camera.position.z = isMobile ? 35 : 25;
    controls.minDistance = isMobile ? 35 : 25;
    controls.maxDistance = isMobile ? 35 : 25;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.enabled = false;
    
    controls.addEventListener('start', function() {
        isDragging = true;
    });
    
    controls.addEventListener('end', function() {
        isDragging = false;
    });
}

function setupLights() {
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnvironment = new RoomEnvironment();
    const environmentTexture = pmremGenerator.fromScene(roomEnvironment).texture;
    scene.environment = environmentTexture;
    pmremGenerator.dispose();
    
    const keyLight = new THREE.DirectionalLight(0xffffff, 2);
    keyLight.position.set(5, 10, 7.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = isMobile ? 512 : 2048;
    keyLight.shadow.mapSize.height = isMobile ? 512 : 2048;
    scene.add(keyLight);
    
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(-5, 0, -5);
    scene.add(fillLight);
    
    const rimLight = new THREE.DirectionalLight(0xffffff, 1);
    rimLight.position.set(0, 5, -10);
    scene.add(rimLight);
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);
    
    window.keyLight = keyLight;
    window.fillLight = fillLight;
    window.rimLight = rimLight;
    window.ambientLight = ambientLight;
}

function updateModelVisibility() {
    if (!object) return;
    
    const scrollPos = window.scrollY;
    const viewportHeight = window.innerHeight;
    const fadeStartThreshold = viewportHeight * 0.7;
    const fadeEndThreshold = viewportHeight * 1.2;
    
    if (scrollPos < fadeStartThreshold) {
        object.visible = true;
        object.traverse(function(child) {
            if (child.isMesh && child.material) {
                child.material.opacity = 1;
                child.material.transparent = false;
            }
        });
    } else if (scrollPos >= fadeStartThreshold && scrollPos < fadeEndThreshold) {
        object.visible = true;
        const fadeProgress = (scrollPos - fadeStartThreshold) / (fadeEndThreshold - fadeStartThreshold);
        const opacity = 1 - fadeProgress;
        
        object.traverse(function(child) {
            if (child.isMesh && child.material) {
                child.material.transparent = true;
                child.material.opacity = opacity;
            }
        });
    } else {
        object.visible = false;
    }
}

function checkModelIntersection() {
    if (!object || !object.visible) return;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(object, true);
    
    if (intersects.length > 0) {
        if (!isOverModel) {
            isOverModel = true;
            renderer.domElement.style.pointerEvents = 'all';
            controls.enabled = true;
            document.body.style.cursor = 'grab';
        }
    } else {
        if (isOverModel) {
            isOverModel = false;
            renderer.domElement.style.pointerEvents = 'none';
            controls.enabled = false;
            isDragging = false;
            document.body.style.cursor = 'default';
        }
    }
}

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    if (window.scrollY < window.innerHeight) {
        checkModelIntersection();
    }
}

function onTouchMove(event) {
    if (event.touches.length > 0) {
        mouse.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
        
        if (window.scrollY < window.innerHeight) {
            checkModelIntersection();
        }
    }
}

function onMouseDown() {
    if (isOverModel) {
        isDragging = true;
        document.body.style.cursor = 'grabbing';
        document.body.style.touchAction = 'none';
        document.body.style.userSelect = 'none';
    }
}

function onMouseUp() {
    isDragging = false;
    document.body.style.touchAction = '';
    document.body.style.userSelect = '';
    if (isOverModel) {
        document.body.style.cursor = 'grab';
    } else {
        document.body.style.cursor = 'default';
    }
}

function onDocumentMouseUp() {
    isDragging = false;
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
}

function handleVideoPlayback() {
    const video = document.getElementById('transitionVideo');
    const videoContainer = document.querySelector('.videoContainer');
    const scrollPos = window.scrollY;
    
    const fadeInStart = 4200;
    const videoPlayStart = 4300;
    const fadeOutStart = 4700;
    const videoEnd = 4800;
    
    if (scrollPos >= fadeInStart && scrollPos < videoEnd) {
        if (featureSection2) {
            featureSection2.style.opacity = '1';
        }
    } else {
        if (featureSection2) {
            featureSection2.style.opacity = '0';
        }
    }
    
    if (scrollPos >= fadeInStart && scrollPos < fadeOutStart) {
        if (!videoContainer.classList.contains('active')) {
            videoContainer.classList.add('active');
            videoContainer.classList.remove('fade-out');
            video.currentTime = 0;
            video.play().catch(err => console.log('Video play error:', err));
        }
    } else if (scrollPos >= fadeOutStart && scrollPos < videoEnd) {
        videoContainer.classList.add('fade-out');
    } else if (scrollPos >= videoEnd) {
        if (videoContainer.classList.contains('active')) {
            videoContainer.classList.remove('active');
            videoContainer.classList.remove('fade-out');
            video.pause();
        }
    } else {
        if (videoContainer.classList.contains('active')) {
            videoContainer.classList.remove('active');
            videoContainer.classList.remove('fade-out');
            video.pause();
        }
    }
}

function createHotspot(desktopPosition, mobilePosition, title, description) {
    const hotspot = document.createElement('div');
    hotspot.className = 'hotspot';
    hotspot.innerHTML = `
        <div class="hotspot-dot"></div>
        <div class="hotspot-label">
            <h4>${title}</h4>
            <p>${description}</p>
        </div>
    `;
    hotspot.style.position = 'absolute';
    hotspot.style.pointerEvents = 'none';
    hotspot.style.opacity = '0';
    hotspot.style.transition = 'opacity 0.5s ease';
    
    document.body.appendChild(hotspot);
    
    hotspots.push({
        element: hotspot,
        desktopPosition: new THREE.Vector3(desktopPosition[0], desktopPosition[1], desktopPosition[2]),
        mobilePosition: new THREE.Vector3(mobilePosition[0], mobilePosition[1], mobilePosition[2]),
        worldPosition: new THREE.Vector3(),
        currentX: 0,
        currentY: 0,
        targetX: 0,
        targetY: 0
    });
    
    console.log('Hotspot created:', title);
    
    return hotspot;
}

let lastHotspotUpdate = 0;
const hotspotUpdateInterval = 100;

function updateHotspotPositions() {
    if (!hotspotsVisible || window.scrollY >= window.innerHeight || !object) {
        hotspots.forEach(hotspot => {
            hotspot.element.style.opacity = '0';
        });
        return;
    }
    
    const isMobileNow = window.innerWidth <= 1200;
    
    hotspots.forEach(hotspot => {
        const positionToUse = isMobileNow ? hotspot.mobilePosition : hotspot.desktopPosition;
        
        hotspot.worldPosition.copy(positionToUse);
        hotspot.worldPosition.applyMatrix4(object.matrixWorld);
        
        const vector = hotspot.worldPosition.clone();
        vector.project(camera);
        
        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (vector.y * -0.5 + 0.5) * window.innerHeight;
        
        const distance = camera.position.distanceTo(hotspot.worldPosition);
        const isBehindCamera = vector.z > 1;
        const isTooFar = distance > 50;
        
        const direction = new THREE.Vector3();
        direction.subVectors(hotspot.worldPosition, camera.position).normalize();
        
        raycaster.set(camera.position, direction);
        const intersects = raycaster.intersectObject(object, true);
        
        let isOccluded = false;
        if (intersects.length > 0) {
            const firstHitDistance = intersects[0].distance;
            const hotspotDistance = camera.position.distanceTo(hotspot.worldPosition);
            isOccluded = firstHitDistance < hotspotDistance - 0.5;
        }
        
        const isVisible = !isBehindCamera && !isTooFar && !isOccluded;
        
        const label = hotspot.element.querySelector('.hotspot-label');
        if (label) {
            const labelOffset = isMobileNow ? 18 : 30;
            const labelWidth = label.offsetWidth || (isMobileNow ? 140 : 270);
            
            if (x + labelOffset + labelWidth > window.innerWidth - 20) {
                label.style.left = 'auto';
                label.style.right = (isMobileNow ? '18px' : '30px');
            } else {
                label.style.left = (isMobileNow ? '18px' : '30px');
                label.style.right = 'auto';
            }
        }
        
        hotspot.element.style.transform = `translate(${x}px, ${y}px)`;
        hotspot.element.style.opacity = isVisible ? '1' : '0';
        
        const zIndex = isVisible ? Math.round(1000 - vector.z * 100) : -1;
        hotspot.element.style.zIndex = zIndex.toString();
    });
}

function toggleHotspots() {
    console.log('Toggle hotspots clicked, current state:', hotspotsVisible);
    
    hotspotsVisible = !hotspotsVisible;
    
    const heroTitle = document.querySelector('.hero h1');
    const heroSubtitle = document.querySelector('.hero h3');
    const heroText = document.querySelector('.hero p');
    
    if (hotspotsVisible) {
        if (heroTitle || heroSubtitle || heroText) {
            heroTitle.style.filter = 'blur(8px)';
            heroTitle.style.transition = 'filter 0.5s ease';
            heroSubtitle.style.filter = 'blur(8px)';
            heroSubtitle.style.transition = 'filter 0.5s ease';
            heroText.style.filter = 'blur(8px)';
            heroText.style.transition = 'filter 0.5s ease';
        }
    } else {
        if (heroTitle || heroSubtitle || heroText) {
            heroTitle.style.filter = 'blur(0px)';
            heroSubtitle.style.filter = 'blur(0px)';
            heroText.style.filter = 'blur(0px)';
        }
    }
    
    if (hotspotsVisible && hotspots.length === 0) {
        console.log('Creating hotspots...');
        
        createHotspot(
            [0.18, 0.45, 0.12],
            [0.1, 0.65, 0.1],
            "Active Noise Cancellation",
            "Blocks external noise for immersive sound"
        );
        
        createHotspot(
            [0, 0.03, 0.1],
            [0, 0.23, 0.1],
            "30hr Battery",
            "All-day listening with charging case"
        );
        
        createHotspot(
            [0, -0.25, 0],
            [0, -0.1, 0.05],
            "USB-C Charging",
            "Fast charge with universal connector"
        );
        
        createHotspot(
            [-0.18, 0.45, 0.12],
            [-0.15, 0.65, 0.1],
            "Spatial Audio",
            "Theater-like sound with head tracking"
        );
        
        console.log('Total hotspots created:', hotspots.length);
    }
    
    hotspots.forEach((hotspot, index) => {
        setTimeout(() => {
            hotspot.element.style.opacity = hotspotsVisible ? '1' : '0';
            hotspot.element.style.pointerEvents = hotspotsVisible ? 'auto' : 'none';
        }, index * 100);
    });
    
    const button = document.getElementById("inspectButton");
    if (button) {
        button.textContent = hotspotsVisible ? "Hide Info" : "Show Features";
        console.log('Button text updated to:', button.textContent);
    }
    
    console.log(`Hotspots: ${hotspotsVisible ? 'VISIBLE' : 'HIDDEN'}`);
}

function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    
    if (mixer) {
        mixer.update(delta);
    }
    
    updateModelVisibility();
    updateHotspotPositions();
    
    if (object && object.visible && window.scrollY < window.innerHeight && !isDragging && !hotspotsVisible) {
        object.rotation.y += 0.008;
    }
    
    controls.update();
    renderer.render(scene, camera);
}

function handleScroll() {
    const scrollPos = window.scrollY;
    const scrollDirection = scrollPos > lastScrollPos ? 'down' : 'up';
    lastScrollPos = scrollPos;
    
    handleVideoPlayback();
    
    const firstSectionHeight = window.innerHeight;
    const scrollIntoContainer = scrollPos - firstSectionHeight;
    
    const firstSectionStart = -300;
    const totalSectionsHeight = featureSections.length * pixelsPerSection;
    const lastSectionEnd = totalSectionsHeight + 200;
    
    if (scrollIntoContainer >= firstSectionStart && scrollIntoContainer < lastSectionEnd) {
        featureBackground.style.opacity = '1';
    } else {
        featureBackground.style.opacity = '0';
    }
    
    if (scrollPos >= firstSectionHeight) {
        renderer.domElement.style.pointerEvents = 'none';
        controls.enabled = false;
        isOverModel = false;
        isDragging = false;
    }
    
    if (scrollPos >= firstSectionHeight && scrollPos < firstSectionHeight + 3000) {
        scrollText.style.opacity = '1';
    } else {
        scrollText.style.opacity = '0';
    }
    
    featureSections.forEach(function(section, index) {
        const sectionStart = index * pixelsPerSection;
        const sectionEnd = (index + 1) * pixelsPerSection;
        
        if (scrollIntoContainer >= sectionStart && scrollIntoContainer < sectionEnd) {
            section.style.opacity = '1';
        } else {
            section.style.opacity = '0';
        }
    });
    
    if (featureSection2) {
        const autoSyncFadeStart = 4200;
        const autoSyncFadeEnd = 4800;
        
        if (scrollPos >= autoSyncFadeStart && scrollPos < autoSyncFadeEnd) {
            featureSection2.style.opacity = '1';
        } else {
            featureSection2.style.opacity = '0';
        }
    }
    
    const buySection = document.querySelector('.buySection');
    const frame2ScrollStart = 8000;
    const frame2ScrollEnd = 10200;
    
    if (buySection) {
        if (scrollPos >= frame2ScrollStart && scrollPos < frame2ScrollEnd) {
            buySection.style.opacity = '1';
        } else {
            buySection.style.opacity = '0';
        }
    }
}

function initCanvasScrollClip(forceInit) {
    const isMobileNow = window.innerWidth <= 1200;
    
    if (forceInit || currentIsMobile !== isMobileNow) {
        currentIsMobile = isMobileNow;
        
        const oldCanvas = document.querySelector('.scrollContainer canvas');
        if (oldCanvas) {
            oldCanvas.remove();
        }
        
        canvasScrollClipInstance = new CanvasScrollClip(scrollContainer, {
            framePath: isMobileNow ? "assets/images/framesMobile/0001.webp" : "assets/images/frames/0001.webp",
            frameCount: 120,
            scrollArea: 5000
        });
        
        const canvas = document.querySelector('.scrollContainer canvas');
        if (canvas) {
            canvas.style.transform = 'translateZ(0)';
            canvas.style.willChange = 'transform';
        }
        
        console.log('Canvas 1 initialized');
        loadingProgress.canvas1 = true;
        checkAllLoaded();
    }
}

function initCanvasScrollClip2(forceInit) {
    const isMobileNow = window.innerWidth <= 1200;

    if (forceInit || currentIsMobile !== isMobileNow) {
        const oldCanvas = document.querySelector('.scrollContainer2 canvas');
        if (oldCanvas) oldCanvas.remove();

        canvasScrollClipInstance2 = new CanvasScrollClip(scrollContainer2, {
            framePath: isMobileNow
                ? "assets/images/frames2Mobile/0001.webp"
                : "assets/images/frames2/0001.webp",
            frameCount: 80,
            scrollArea: 5000
        });

        const canvas = document.querySelector('.scrollContainer2 canvas');
        if (canvas) {
            canvas.style.transform = 'translateZ(0)';
            canvas.style.willChange = 'transform';
        }

        console.log('Canvas 2 initialized');
        loadingProgress.canvas2 = true;
        checkAllLoaded();
    }
}

function handleResize() {
    const isMobileNow = window.innerWidth <= 1200;
    isMobile = isMobileNow;
    
    camera.position.z = isMobileNow ? 35 : 25;
    controls.minDistance = isMobileNow ? 35 : 25;
    controls.maxDistance = isMobileNow ? 35 : 25;
    
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = !isMobileNow;
    renderer.setPixelRatio(isMobileNow ? 1 : Math.min(window.devicePixelRatio, 3));
    
    window.keyLight.shadow.mapSize.width = isMobileNow ? 512 : 2048;
    window.keyLight.shadow.mapSize.height = isMobileNow ? 512 : 2048;
    
    initCanvasScrollClip();
    initCanvasScrollClip2();
}

function setupDarkMode() {
    document.querySelectorAll('.theme-switch').forEach(function(switchElement) {
        switchElement.addEventListener('change', function() {
            const isDarkMode = this.checked;
            
            if (isDarkMode) {
                document.body.classList.add('dark-mode');
                window.keyLight.intensity = 2;
                window.fillLight.intensity = 4;
                window.rimLight.intensity = 2;
                window.ambientLight.intensity = 0.05;
                renderer.toneMappingExposure = 0.6;
            } else {
                document.body.classList.remove('dark-mode');
                window.keyLight.intensity = 2;
                window.fillLight.intensity = 0.5;
                window.rimLight.intensity = 1;
                window.ambientLight.intensity = 0.3;
                renderer.toneMappingExposure = 1.5;
            }
            
            document.querySelectorAll('.theme-switch').forEach(function(otherSwitch) {
                otherSwitch.checked = switchElement.checked;
            });
        });
    });
}

function setupLearnMoreButton() {
    const learnMoreButton = document.querySelector('.learnButton');
    
    if (learnMoreButton) {
        learnMoreButton.addEventListener('click', function(e) {
            e.preventDefault();
            
            const scrollAmount = 1600
            const duration = 1000;
            
            smoothScrollBy(scrollAmount, duration);
        });
    }
}

function setupBuyButton() {
    const buyButton = document.querySelector('.buyButton');
    
    if (buyButton) {
        buyButton.addEventListener('click', function(e) {
            e.preventDefault();

            const scrollAmount = 9000;
            const duration = 3000;
            
            smoothScrollBy(scrollAmount, duration);
        });
    }
}

function smoothScrollBy(distance, duration) {
    const startPosition = window.pageYOffset;
    const startTime = performance.now();
    
    function animation(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const easeInOutCubic = progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        
        window.scrollTo(0, startPosition + (distance * easeInOutCubic));
        
        if (progress < 1) {
            requestAnimationFrame(animation);
        }
    }
    
    requestAnimationFrame(animation);
}

function init() {
    console.log('Initializing');
    
    featureSection2 = document.querySelector('.featureSection2');
    
    document.querySelectorAll('.theme-switch').forEach(function(switchElement) {
        switchElement.checked = false;
    });
    
    document.body.classList.remove('dark-mode');
    
    setupRenderer();
    setupControls();
    setupLights();
    loadModel();
    preloadImages();
    initCanvasScrollClip(true);
    initCanvasScrollClip2(true);
    setupDarkMode();
    setupLearnMoreButton();
    setupBuyButton();
    
    const inspectBtn = document.getElementById("inspectButton");
    if (inspectBtn) {
        inspectBtn.addEventListener("click", function(e) {
            e.preventDefault();
            toggleHotspots();
        });
        console.log('Inspect button listener attached');
    } else {
        console.error('Inspect button not found!');
    }
    
    animate();
}

window.addEventListener('mousemove', onMouseMove);
window.addEventListener('mousedown', onMouseDown);
window.addEventListener('mouseup', onMouseUp);
window.addEventListener('touchmove', onTouchMove, { passive: true });
window.addEventListener('touchstart', onMouseDown);
window.addEventListener('touchend', onMouseUp);
window.addEventListener('scroll', handleScroll);
window.addEventListener('resize', handleResize);
window.addEventListener('load', init);

document.addEventListener('mouseup', onDocumentMouseUp);