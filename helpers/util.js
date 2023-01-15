// THIS CODE WAS BORROWED FROM A YOUTUBE TUTORIAL
// HERE IS THE LINKED GITHUB REPO: https://github.com/tamani-coding/threejs-character-controls-example/blob/main/src/utils.ts
// I removed the type to convert the TypeScript into JavaScript
const W = "w";
const A = "a";
const S = "s";
const D = "d";
const SHIFT = "shift";

export class KeyDisplay {
  map = new Map();

  constructor() {
    const w = document.createElement("div");
    const a = document.createElement("div");
    const s = document.createElement("div");
    const d = document.createElement("div");
    const shift = document.createElement("div");

    this.map.set(W, w);
    this.map.set(A, a);
    this.map.set(S, s);
    this.map.set(D, d);
    this.map.set(SHIFT, shift);

    this.map.forEach((v, k) => {
      v.style.color = "blue";
      v.style.fontSize = "50px";
      v.style.fontWeight = "800";
      v.style.position = "absolute";
      v.textContent = k;
    });

    this.updatePosition();

    this.map.forEach((v, _) => {
      document.body.append(v);
    });
  }

  updatePosition() {
    this.map.get(W).style.top = `${window.innerHeight - 200}px`;
    this.map.get(A).style.top = `${window.innerHeight - 150}px`;
    this.map.get(S).style.top = `${window.innerHeight - 150}px`;
    this.map.get(D).style.top = `${window.innerHeight - 150}px`;
    this.map.get(SHIFT).style.top = `${window.innerHeight - 75}px`;

    this.map.get(W).style.left = `${200}px`;
    this.map.get(A).style.left = `${100}px`;
    this.map.get(S).style.left = `${200}px`;
    this.map.get(D).style.left = `${300}px`;
    this.map.get(SHIFT).style.left = `${140}px`;
  }

  down(key) {
    if (this.map.get(key.toLowerCase())) {
      this.map.get(key.toLowerCase()).style.color = "red";
    }
  }

  up(key) {
    if (this.map.get(key.toLowerCase())) {
      this.map.get(key.toLowerCase()).style.color = "blue";
    }
  }
}
