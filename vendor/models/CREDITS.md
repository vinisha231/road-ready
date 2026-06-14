# 3D model & library credits

RoadReady bundles a few third-party assets so the game works offline with no CDN.

## Car models
- **ferrari.glb** — sports-car model distributed with [three.js](https://github.com/mrdoob/three.js)
  (`examples/models/gltf/ferrari.glb`). Used in RoadReady as the "Scuderia GT" and
  "GT Track Edition" cars (recolored at runtime).
- **carconcept.glb** — "Car Concept" from the Khronos
  [glTF-Sample-Assets](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept),
  licensed **CC-BY 4.0**. Used as the "Hyper Concept" car.

These are representative realistic vehicles, not officially licensed reproductions
of any specific make or model.

## Libraries (three.js r160, MIT)
- `three.module.min.js`, `GLTFLoader.js`, `DRACOLoader.js`, `BufferGeometryUtils.js`,
  `RoomEnvironment.js`, and the `draco/` decoder — all from
  [three.js](https://github.com/mrdoob/three.js) (MIT License), vendored unmodified
  except for one relative-import path fix in `GLTFLoader.js`.
