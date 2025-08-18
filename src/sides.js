import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";


export function addWoodAndTrees(scene) {
  const loader = new GLTFLoader();
  loader.load('/models/Tree-2.glb', (gltf) => {
    
    const tree2 = gltf.scene;
    tree2.scale.set(20, 25, 20);
    for(let i = 1; i < 19; i++) {
        const clone1 = tree2.clone();
        const clone2 = tree2.clone();
        const clone3 = tree2.clone();
        const clone4 = tree2.clone();
        clone1.position.set(450 - (i * 48.5), 45, 450);
        clone2.position.set(450 - (i * 48.5), 45, -450);
        clone3.position.set(450, 45, 450 - (i * 48.5));
        clone4.position.set(-450, 45, 450 - (i * 48.5));

        //Shadows
        clone1.castShadow = true; clone1.receiveShadow = true;
        clone2.castShadow = true; clone2.receiveShadow = true;
        clone3.castShadow = true; clone3.receiveShadow = true;
        clone4.castShadow = true; clone4.receiveShadow = true;
    scene.add(clone1, clone2, clone3, clone4);
    }
  });

  loader.load('/models/TreesAndRocks.glb', (gltf) => {
    const treeAndRocks = gltf.scene;
    // treeAndRocks.scale.set(0.5, 0.5, 0.5);
    for(let i = 0; i < 17; i++) {
        const clone = treeAndRocks.clone();
        const clone2 = treeAndRocks.clone();
        const clone3 = treeAndRocks.clone();
        const clone4 = treeAndRocks.clone();
        clone.position.set(400 - (i * 48.5), 0.5, 400);
        clone.rotation.set(0, Math.PI * 2 , 0);
        
        clone2.position.set(400 - (i * 48.5), 0.5, -400);
        clone2.rotation.set(0, Math.PI, 0);
        
        clone3.position.set(400 , 0.5, 400 - (i * 48.5));
        clone3.rotation.set(0, Math.PI * 0.5 , 0);
        
        clone4.position.set(-400, 0.5, 400 - (i * 48.5));
        clone4.rotation.set(0, -Math.PI * 0.5 , 0);

        scene.add(clone, clone2, clone3, clone4);
    }
  });

  loader.load('/models/Tree-3.glb', (gltf) => {
    const tree3 = gltf.scene;
    tree3.scale.set(6, 10, 6);
    tree3.rotation.set(0, Math.PI * 0.5 , 0);
    const numTrees = 250;
    const totalArea = 575;
    const centerExclusion = 465;
    let placed = 0;
    let attempts = 0;
    const maxAttempts = 1000; 
    window.allTreePositions = [];
    while (placed < numTrees && attempts < maxAttempts) {
      attempts++;
      const x = Math.random() * 2 * totalArea - totalArea;
      const z = Math.random() * 2 * totalArea - totalArea;
            if (Math.abs(x) < centerExclusion && Math.abs(z) < centerExclusion) continue;
      
      let tooClose = false;
      for (let i = 0; i < window.allTreePositions.length; i++) {
        const dx = x - window.allTreePositions[i].x;
        const dz = z - window.allTreePositions[i].z;
        if (Math.sqrt(dx*dx + dz*dz) < 5) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;
      
      const clone = tree3.clone();
      clone.position.set(x, 0.5, z);
      scene.add(clone);
      window.allTreePositions.push({x, z});
      placed++;
    }

  });

  loader.load('/models/Tree-4.glb', (gltf) => {
    const tree4 = gltf.scene;
    tree4.scale.set(6, 8, 6);
    tree4.rotation.set(0, Math.PI * 0.5 , 0);
    const numTrees = 250;
    const area = 575;
    const centerExclusion = 465;
    let placed = 0;
    let attempts = 0;
    const maxAttempts = 1000;

    while (placed < numTrees && attempts < maxAttempts) {
      attempts++;
      const x = Math.random() * 2 * area - area;
      const z = Math.random() * 2 * area - area;
      if (Math.abs(x) < centerExclusion && Math.abs(z) < centerExclusion) continue;
      let tooClose = false;
      for (let i = 0; i < window.allTreePositions.length; i++) {
        const dx = x - window.allTreePositions[i].x;
        const dz = z - window.allTreePositions[i].z;
        if (Math.sqrt(dx*dx + dz*dz) < 5) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;
      const clone = tree4.clone();
      clone.position.set(x, 0.5, z);
      scene.add(clone);
      window.allTreePositions.push({x, z});
      placed++;
    }
    
    if (attempts >= maxAttempts) {
      console.warn('Tree-4 placement reached maximum attempts. Placed:', placed, 'trees');
    } else {
      console.log('Successfully placed', placed, 'Tree-4 trees');
    }
  });
} 