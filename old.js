    // objects///////////////////////////////////////////////////////////////////////////////////////////
    const boxGeometry = new THREE.BoxGeometry(20, 20, 20).toNonIndexed();

    position = boxGeometry.attributes.position;
    const colorsBox = [];

    for (let i = 0, l = position.count; i < l; i++) {

        color.setHSL(Math.random() * 0.3 + 0.5, 0.75, Math.random() * 0.25 + 0.75);
        colorsBox.push(color.r, color.g, color.b);

    }

    boxGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colorsBox, 3));

    for (let i = 0; i < 50; i++) {

        const boxMaterial = new THREE.MeshPhongMaterial({ specular: 0xffffff, flatShading: true, vertexColors: true });
        boxMaterial.color.setHSL(Math.random() * 0.2 + 0.5, 0.75, Math.random() * 0.25 + 0.75);

        const box = new THREE.Mesh(boxGeometry, boxMaterial);
        box.position.x = Math.floor(Math.random() * 20 - 10) * 20;
        box.position.y = Math.floor(Math.random() * 20) * 20 + 10;
        box.position.z = Math.floor(Math.random() * 20 - 10) * 20;

        scene.add(box);
        objects.push(box);

    }
    ////////////////////////////////////////////////////////////////////////////////////////