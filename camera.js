import * as THREE from "./node_modules/three/build/three.module.js";

class ThirdPersonCamera {
  constructor(params) {
    this._params = params;
    this._camera = params.camera;

    this._currentPosition = new THREE.Vector3();
    this.currrentLookat = new THREE.Vector3();
  }

  _CalculateIdealOffset() {
    const idealOffset = new THREE.Vector3(-15, 20, -30);

    //copy the character's orientation since the character's offset is in local space
    idealOffset.applyQuaternion(this._params.target.Rotation);
    idealOffset.add(this._params.target.Position);
    return idealOffset;
  }

  _CalculateIdealLookat() {
    const idealLookat = new THREE.Vector3(0, 10, 50);
    idealLookat.applyQuaternion(this._params.target.Rotation);
    idealLookat.add(this._params.target.Position);
    return idealLookat;
  }

  Update(timeElapsed) {
    const idealOffset = this._CalculateIdealOffset();
    const idealLookat = this._CalculateIdealLookat();

    this._currentPosition.copy(idealOffset);
    this._currentPosition.copy(idealLookat);

    this._camera.position.copy(this._currentPosition);
    this.camera.lookAt(this._currentLookat);
  }
}

export default ThirdPersonCamera;
