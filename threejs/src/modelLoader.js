import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const loader = new GLTFLoader();
export function loadModel(url, onProgress) {
  return new Promise((resolve, reject) => {
    loader.load(url, gltf => resolve(gltf.scene), evt => {
      if (evt.total > 0) onProgress?.(Math.round(evt.loaded / evt.total * 100));
      else onProgress?.(null);
    }, reject);
  });
}
