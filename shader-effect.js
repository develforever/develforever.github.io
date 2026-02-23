const curtains = new Curtains({
  container: "canvas",
  watchScroll: true,
  pixelRatio: Math.min(2, window.devicePixelRatio),
  alpha: true,
  premultipliedAlpha: true,
  depth: true,
  production: false,
});

window.addEventListener("load", () => {
  const vs = `
        precision mediump float;
        attribute vec3 aVertexPosition;
        attribute vec2 aTextureCoord;
        uniform mat4 uMVMatrix;
        uniform mat4 uPMatrix;
        varying vec2 vTextureCoord;

        void main() {
            gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
            vTextureCoord = aTextureCoord;
        }
    `;

  const fs = `
        precision mediump float;
varying vec2 vTextureCoord;
uniform sampler2D uSampler0;
uniform float uTime;
uniform vec2 uMouse;
uniform float uStrength;
uniform float uRadius;
uniform vec2 uResolution;
uniform float uBorderWidth;

float roundedBoxSDF(vec2 centerPos, vec2 size, float radius) {
    return length(max(abs(centerPos) - size + radius, 0.0)) - radius;
}

void main() {

    vec2 uv = vTextureCoord;

    float maxRadius = min(uResolution.x, uResolution.y) * 0.5;
    float fixedRadius = min(uRadius, maxRadius);

    vec2 halfRes = uResolution * 0.5;
    vec2 internalSize = halfRes - uBorderWidth;
    float internalRadius = max(0.0, fixedRadius - uBorderWidth);
    vec2 p = uv * uResolution - halfRes;
    
    float d = roundedBoxSDF(p, internalSize, internalRadius);
    if (d > 0.0) discard;
  
    vec2 mousePos = uMouse;
    float dist = distance(vTextureCoord, mousePos);
    
    float tau = 6.2831853071;
    float time = mod(uTime, tau);
    float ripple = sin(dist * 15.0 - time) * uStrength;

    float mask = smoothstep(0.45, 0.0, dist * 0.85); 
    
    vec2 newCoords = vTextureCoord + (vTextureCoord - mousePos) * ripple * mask;

    vec2 finalCoords = clamp(newCoords, 0.0, 1.0);

    vec4 color = texture2D(uSampler0, finalCoords);

    gl_FragColor = vec4(color.rgb, color.a);
}
    `;
  const params = {
    vertexShader: vs,
    fragmentShader: fs,
    visible: false,
    widthSegments: 20,
    heightSegments: 20,
    uniforms: {
      uTime: { name: "uTime", type: "1f", value: 0.0 },
      uMouse: { name: "uMouse", type: "2f", value: [0.5, 0.5] },
      uStrength: { name: "uStrength", type: "1f", value: 0.0 },
      uRadius: { name: "uRadius", type: "1f", value: 16.0 },
      uResolution: {
        name: "uResolution",
        type: "2f",
        value: [200.0, 200.0],
      },
      uBorderWidth: { name: "uBorderWidth", type: "1f", value: 0.0 },
    },
    alwaysDraw: false,
  };

  const containerEl = document.querySelector(".avatar");
  const plane = new Plane(curtains, containerEl, params);

  if (!plane) return;

  const computedStyleMeta = window.getComputedStyle(containerEl);
  let parentBB = containerEl.getBoundingClientRect();

  if (computedStyleMeta) {
    params.uniforms.uRadius.value = parseFloat(computedStyleMeta.borderRadius);
  }
  plane.uniforms.uResolution.value = [parentBB.width, parentBB.height];

  plane
    .onReady(() => {
      containerEl.addEventListener("mouseenter", (e) => {
        plane.uniforms.uStrength.value = 0.05;
      });

      containerEl.addEventListener("mousemove", (e) => {
        const mousePos = plane.mouseToPlaneCoords({
          x: e.clientX,
          y: e.clientY,
        });
        const normalizedX = (mousePos.x + 1) / 2;
        const normalizedY = (mousePos.y + 1) / 2;

        plane.uniforms.uMouse.value = [normalizedX, normalizedY];

        if (plane.uniforms.uStrength.value < 0.001) {
          plane.uniforms.uStrength.value += 0.01;
        } else {
          if (plane.uniforms.uStrength.value > 0.35) {
            plane.uniforms.uStrength.value -= 0.02;
            if (plane.uniforms.uStrength.value < 0.001) {
              plane.uniforms.uStrength.value = 0;
            }
          } else {
            plane.uniforms.uStrength.value += 0.02;
            if (plane.uniforms.uStrength.value > 0.35) {
              plane.uniforms.uStrength.value = 0.35;
            }
          }
        }
      });

      containerEl.addEventListener("mouseleave", (e) => {
        plane.uniforms.uStrength.value -= 0.05;
      });

      containerEl.querySelector("img").classList.add("avatar--ready");
      plane.visible = true;
    })
    .onRender(() => {
      plane.uniforms.uTime.value += 0.1;

      plane.uniforms.uStrength.value *= 0.94;

      if (plane.uniforms.uStrength.value < 0.001) {
        plane.uniforms.uStrength.value = 0;
      }
    });
});
