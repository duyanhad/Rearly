import { useFrame, useThree } from '@react-three/fiber';
import { SafeCanvas } from '../../../components/SafeCanvas';
import { ContactShadows, useTexture } from '@react-three/drei';
import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { makeCutout, makePreCut } from '../../../utils/cutout';
import { useLiquidColor } from '../hooks/useLiquidColor';
import { pourSeconds } from '../pourTiming';
const BASE_Y = -0.95;
const CUP_HEIGHT = 1.9;

/**
 * Cốc 3D.
 * - `spill`  : số ml vừa bị partner trừ → cốc nghiêng đổ nước ra (mạnh/nhẹ theo ml).
 * - `pourIn` : số ml vừa được thêm → avatar rót nước từ góc trên-trái vào miệng cốc.
 * - `celebrate`: cốc nhảy múa khi vừa đạt 100% mục tiêu.
 * Cả hai hiệu ứng nước chỉ để xem, tự kết thúc sau 1–4 giây.
 */
export function WaterCup3D({
  percent,
  textureUrl,
  spill = 0,
  spillKey = 0,
  pourIn = 0,
  pourKey = 0,
  pourOrigin = null,
  preCut = false,
  pendingPercent = 0,
  size = 'lg',
  celebrate = false
}) {
  const p = Math.min(1, Math.max(0, percent / 100));
  // Nước đang chờ partner duyệt: vẽ thêm lớp mờ phía trên mực nước đã duyệt.
  const pending = Math.min(1, Math.max(0, (pendingPercent || 0) / 100));
  // Thời gian rót (ms) dùng chung cho dòng nước, độ nghiêng cốc và mực nước dâng.
  const fillMs = pourIn > 0 ? pourSeconds(pourIn) * 1000 : 0;
  const dims = size === 'sm' ? 'h-40 w-full' : 'h-64 w-full md:h-80';
  // Màu nước lấy từ chính ảnh cốc (không phải luôn xanh).
  const liquidColor = useLiquidColor(textureUrl, preCut);
  // Trạng thái nghiêng hiện tại của cốc (CupTilt ghi vào) → dòng nước bám đúng miệng cốc.
  const tiltRef = useRef({ rot: 0, x: 0, y: 0 });
  // Điểm đổ nước (mép miệng) do chính cốc tự đo từ ảnh → dòng nước luôn bám đúng chỗ.
  const pourPointRef = useRef(null);

  // Mỗi lần có ml bị trừ: nghiêng tương ứng (tối đa 0.62 rad) và trừ bớt nước hiển thị.
  // Nước càng cạn thì càng nghiêng nhiều để mặt nước chạm miệng cốc và chảy ra được.
  const emptyK = 0.6 + (1 - p) * 1.2;
  const spillTilt = Math.min(0.92, (spill / 700) * 0.62 * emptyK);
  const drained = Math.min(0.8, spill / 1400);
  const shown = Math.max(0.015, p - drained);

  return (
    <div className={dims}>
      <SafeCanvas camera={{ position: [0, 0.35, 4.1], fov: 40 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }} fallback={<GlassCup percent={percent} color={liquidColor} fillMs={fillMs} />}>
        <ambientLight intensity={0.9} />
        <directionalLight position={[2.5, 4, 3]} intensity={1.3} />
        <directionalLight position={[-3, 1.5, -2]} intensity={0.5} />
        <Suspense fallback={null}>
          <CupTilt
            tiltRef={tiltRef}
            spillKey={spillKey}
            tilt={spillTilt}
            pourKey={pourKey}
            pourSeconds={pourSeconds(pourIn)}
            celebrate={celebrate}
          >
            <CupBoundary key={textureUrl ?? 'glass'} fallback={<GlassCup percent={shown} color={liquidColor} fillMs={fillMs} pending={pending} pourPointRef={pourPointRef} />}>
              {textureUrl ? (
                <PhotoCup url={textureUrl} percent={shown} liquidColor={liquidColor} fillMs={fillMs} preCut={preCut} pending={pending} pourPointRef={pourPointRef} />
              ) : (
                <GlassCup percent={shown} color={liquidColor} fillMs={fillMs} pending={pending} pourPointRef={pourPointRef} />
              )}
            </CupBoundary>
          </CupTilt>
        </Suspense>
        {!celebrate && (
          <SpillStream spill={spill} spillKey={spillKey} tiltRef={tiltRef} pourPointRef={pourPointRef} color={liquidColor} />
        )}
        {!celebrate && (
          <PourStream pourIn={pourIn} pourKey={pourKey} color={liquidColor} origin={pourOrigin} />
        )}
        {!celebrate && <SpillPuddle spill={spill} spillKey={spillKey} tiltRef={tiltRef} pourPointRef={pourPointRef} color={liquidColor} />}
        <ContactShadows position={[0, BASE_Y - 0.01, 0]} opacity={0.28} scale={4} blur={2.6} far={2} />
      </SafeCanvas>
    </div>
  );
}


/** Nghiêng cốc khi bị trừ nước, ngả nhẹ về phía avatar khi hứng nước; nhảy múa khi đạt mục tiêu. */
function CupTilt({ spillKey, tilt, pourKey, pourSeconds: pourDur = 1.15, celebrate = false, tiltRef, children }) {
  const groupRef = useRef(null);
  const spillAt = useRef(0);
  const pourAt = useRef(0);

  useEffect(() => {
    if (spillKey) spillAt.current = performance.now();
  }, [spillKey]);
  useEffect(() => {
    if (pourKey) pourAt.current = performance.now();
  }, [pourKey]);

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;
    const now = performance.now();

    // Đạt mục tiêu: cốc nhảy lên xoay qua lại như đang ăn mừng.
    if (celebrate) {
      const t = now / 1000;
      g.rotation.z = Math.sin(t * 6.2) * 0.22;
      g.rotation.y = Math.sin(t * 2.6) * 0.35;
      g.position.y = Math.abs(Math.sin(t * 3.4)) * 0.18;
      g.position.x = Math.sin(t * 3.1) * 0.06;
      g.scale.setScalar(1 + Math.abs(Math.sin(t * 3.4)) * 0.03);
      return;
    }
    g.scale.setScalar(1);

    // Hiệu ứng đổ nước kéo dài ~2s: nghiêng vào rồi trả lại từ từ.
    const spillAge = (now - spillAt.current) / 1000;
    const spillK = spillAge < 2.2 ? Math.sin(min01(spillAge / 2.2) * Math.PI) : 0;
    const tiltNow = -tilt * spillK;

    // Rót nước: cốc ngả về phía avatar (bên trái) để hứng dòng nước.
    const pourAge = (now - pourAt.current) / 1000;
    const pourK = pourAge < pourDur ? Math.sin(min01(pourAge / pourDur) * Math.PI) : 0;

    const k = Math.min(1, delta * 9);
    g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, tiltNow + pourK * 0.11, k);
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, pourK * 0.03, k);
    g.position.x = THREE.MathUtils.lerp(g.position.x, Math.abs(tiltNow) * 0.35 - pourK * 0.05, k);
    g.position.y = THREE.MathUtils.lerp(g.position.y, -Math.abs(tiltNow) * 0.2, k);

    // Chia sẻ trạng thái nghiêng để dòng nước tràn bám đúng miệng cốc.
    if (tiltRef) tiltRef.current = { rot: g.rotation.z, x: g.position.x, y: g.position.y };
  });

  return <group ref={groupRef}>{children}</group>;
}

const min01 = (v) => Math.min(1, Math.max(0, v));

/**
 * Nội suy mực nước: khi rót thì chờ nước chạm miệng cốc rồi mới dâng dần trong đúng
 * thời gian rót → mực nước và dòng nước đồng bộ, không nhảy giật.
 */
function useFillTween(percent, fillMs) {
  const ref = useRef({ value: percent, from: percent, to: percent, start: 0, dur: 0.4, delay: 0 });
  useEffect(() => {
    const from = ref.current.value;
    const dur = Math.max(0.35, (fillMs || 0) / 1000);
    ref.current = {
      value: from,
      from,
      to: percent,
      start: performance.now() / 1000,
      dur,
      delay: fillMs ? Math.min(0.6, dur * 0.32) : 0.05,
    };
  }, [percent, fillMs]);
  return ref;
}

/** Giá trị mực nước hiện tại (0..1) theo thời gian thực, làm mượt bằng smoothstep. */
function sampleFill(ref) {
  const f = ref.current;
  const t = (performance.now() / 1000 - f.start - f.delay) / f.dur;
  const k = t <= 0 ? 0 : t >= 1 ? 1 : t;
  const eased = k * k * (3 - 2 * k);
  f.value = f.from + (f.to - f.from) * eased;
  return f.value;
}

/**
 * Dòng nước mềm dùng chung: mặt phẳng có shader mờ 2 đầu và 2 bên
 * → nước chảy thành dòng mảnh, không bị "thô" như trụ đặc.
 */
const streamVertex = /* glsl */ `
  uniform float uTime;
  uniform float uBow;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 pos = position;
    // Dòng nước uốn nhẹ theo chiều rơi cho mềm mại
    float bend = sin(uv.y * 5.0 - uTime * 3.0) * 0.02 * uv.y;
    // Cung cong: nước bắn ra khỏi cốc của avatar rồi rơi xuống miệng cốc
    pos.x -= sin(uv.y * 3.14159) * uBow;
    pos.x += bend;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const streamFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uTaper;
  uniform float uReveal;
  varying vec2 vUv;

  void main() {
    float d = abs(vUv.x - 0.5) * 2.0;      // 0 ở giữa, 1 ở mép
    float across = abs(vUv.x - 0.34);      // khoảng cách tới vệt sáng

    // Thân nước: đặc ở giữa, mềm ở hai mép
    float body = 1.0 - smoothstep(0.5, 1.0, d);
    // Khối nước: viền đậm (khúc xạ) → lõi sáng (nước trong)
    float core = 1.0 - smoothstep(0.0, 0.62, d);
    // Vệt sáng phản chiếu + lấp lánh chạy dọc dòng
    float shine = (1.0 - smoothstep(0.0, 0.3, across)) * (0.5 + 0.5 * sin(vUv.y * 26.0 - uTime * 10.0));
    // Gợn sóng nhẹ cho thấy nước đang chảy
    float ripple = 0.9 + 0.1 * sin(vUv.y * 34.0 - uTime * 14.0 + vUv.x * 3.0);

    // Đầu dòng mờ vào cốc của avatar, cuối dòng tan vào mặt nước
    float head = smoothstep(0.0, 0.1, vUv.y);
    float tail = 1.0 - smoothstep(0.84, 1.0, vUv.y);
    // Nước chảy dần từ avatar xuống: chỉ hiện tới vị trí uReveal
    float reveal = 1.0 - smoothstep(uReveal, uReveal + 0.08, vUv.y);
    float taper = mix(1.0, mix(1.0, 0.6, vUv.y), uTaper);

    // Viền đậm hơn màu nước, lõi sáng hơn → dòng nước trông có khối, không phải nét vẽ
    vec3 deep = uColor * 0.78 + vec3(0.02, 0.03, 0.05);
    vec3 lit = uColor * 1.35 + vec3(0.14, 0.18, 0.22);
    vec3 col = mix(deep, lit, core);
    col = mix(col, vec3(1.0), shine * 0.55);

    float alpha = body * head * tail * ripple * taper * reveal * uOpacity;
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
  }
`;
function makeStreamMaterial(color, taper, bow = 0) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uTaper: { value: taper },
      uReveal: { value: 1 },
      uBow: { value: bow },
    },
    vertexShader: streamVertex,
    fragmentShader: streamFragment,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/**
 * Nước đổ ra khi partner trừ: một dòng liền từ mép cốc xuống vũng (không dùng giọt rời).
 */
// Điểm đổ (local, trong hệ của CupTilt) → toạ độ sau khi cốc nghiêng + điểm nước rơi xuống đất.
function spillFromPoint(st, point, strength) {
  const cos = Math.cos(st.rot);
  const sin = Math.sin(st.rot);
  const x = point.x * cos - point.y * sin + st.x;
  const y = point.x * sin + point.y * cos + st.y;
  return { x, y, landX: x + 0.14 + strength * 0.15 };
}
// Mép ngoài cùng bên phải của miệng cốc theo góc nghiêng hiện tại + điểm nước rơi xuống đất.
const RIM_RADIUS = 0.66;
function spillLip(st, strength) {
  const rimLocalY = BASE_Y + CUP_HEIGHT * 0.95;
  const cos = Math.cos(st.rot);
  const sin = Math.sin(st.rot);
  const x = st.x + RIM_RADIUS * cos - sin * rimLocalY;
  const y = st.y + RIM_RADIUS * sin + cos * rimLocalY;
  return { x, y, landX: x + 0.16 + strength * 0.16 };
}

function SpillStream({ spill, spillKey, tiltRef, pourPointRef, color }) {
  const meshRef = useRef(null);
  const startedAt = useRef(0);
  const material = useMemo(() => makeStreamMaterial(color, 1), [color]);

  // Hình dải nước dựng sẵn, mỗi frame cập nhật lại đỉnh theo miệng cốc thật + sóng sánh.
  const geometry = useMemo(() => {
    const segments = 44;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((segments + 1) * 2 * 3), 3));
    const uvs = new Float32Array((segments + 1) * 2 * 2);
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      uvs[i * 4] = 0;
      uvs[i * 4 + 1] = 1 - t;
      uvs[i * 4 + 2] = 1;
      uvs[i * 4 + 3] = 1 - t;
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    const indices = [];
    for (let i = 0; i < segments; i++) {
      const v = i * 2;
      indices.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
    }
    g.setIndex(indices);
    return g;
  }, []);

  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => {
    material.uniforms.uColor.value = new THREE.Color(color);
  }, [material, color]);
  useEffect(() => {
    if (spillKey) startedAt.current = performance.now();
  }, [spillKey]);

  const tmp = useMemo(
    () => ({
      curve: new THREE.CubicBezierCurve3(new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()),
      point: new THREE.Vector3(),
      tangent: new THREE.Vector3(),
    }),
    [],
  );

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const now = performance.now();
    const age = (now - startedAt.current) / 1000;
    const strength = min01(spill / 900);
    const duration = 1.15 + strength * 0.9;
    const active = spill > 0 && age > 0.18 && age < duration + 0.5;

    // Cốc nghiêng xong mới thấy nước tràn ra; hết lượng thì ngừng chảy.
    const fade = !active ? 0 : age > duration ? Math.max(0, 1 - (age - duration) / 0.5) : 1;
    material.uniforms.uTime.value = clock.getElapsedTime();
    material.uniforms.uReveal.value = Math.min(1, Math.max(0, (age - 0.18) / 0.35));
    material.uniforms.uOpacity.value = THREE.MathUtils.lerp(
      material.uniforms.uOpacity.value,
      fade * (0.7 + strength * 0.25),
      0.25,
    );
    mesh.visible = material.uniforms.uOpacity.value > 0.01;
    if (!mesh.visible) return;

    // Mép ngoài cùng bên phải của miệng cốc (điểm thấp nhất khi nghiêng) → nước tràn đúng chỗ.
    const st = tiltRef?.current ?? { rot: 0, x: 0, y: 0 };
    const point = pourPointRef?.current ?? { x: RIM_RADIUS, y: BASE_Y + CUP_HEIGHT * 0.95 };
    const { x: rimX, y: rimY, landX } = spillFromPoint(st, point, strength);

    // Nước rơi gần như thẳng đứng từ mép (trọng lực), chỉ hơi bắn ra ngoài.
    const endX = landX + Math.sin(now / 320) * 0.02;
    const endY = BASE_Y + 0.02;

    // Sóng sánh: dòng nước uốn qua lại theo thời gian, độ uốn theo lượng nước bị trừ.
    const wob = Math.sin(now / 210) * (0.03 + strength * 0.045);
    const wob2 = Math.sin(now / 130 + 1.7) * (0.012 + strength * 0.02);

    const c = tmp.curve;
    c.v0.set(rimX - 0.02, rimY + 0.03, 0);
    // Bắt đầu trượt nhẹ qua mép rồi rơi gần như thẳng đứng → nhìn như nước tràn thật.
    c.v1.set(rimX + 0.05 + wob * 0.5, rimY - 0.02, 0);
    c.v2.set(endX - 0.02 - wob2, endY + Math.abs(rimY - endY) * 0.55, 0);
    c.v3.set(endX, endY, 0);

    const pos = geometry.attributes.position.array;
    const segments = 44;
    const pulse = 0.88 + Math.sin(now / 150) * 0.12;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      c.getPoint(t, tmp.point);
      c.getTangent(t, tmp.tangent);
      const len = Math.hypot(tmp.tangent.x, tmp.tangent.y) || 1;
      const nx = -tmp.tangent.y / len;
      const ny = tmp.tangent.x / len;
      // Rộng ở miệng cốc, mảnh dần khi rơi; to/nhỏ theo số ml bị trừ.
      const half = THREE.MathUtils.lerp(0.12 * (0.8 + strength * 0.5), 0.032, t) * pulse;
      const a = i * 6;
      pos[a] = tmp.point.x + nx * half;
      pos[a + 1] = tmp.point.y + ny * half;
      pos[a + 3] = tmp.point.x - nx * half;
      pos[a + 4] = tmp.point.y - ny * half;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeBoundingSphere();
  });

  // z hơi dương: dòng nước nằm trước miệng cốc để thấy rõ nó tràn ra ngoài.
  return <mesh ref={meshRef} visible={false} position={[0, 0, 0.2]} geometry={geometry} material={material} />;
}
function makePourGeometry(startX, startY, endX, endY) {
  const spread = Math.abs(endX - startX);
  const drop = Math.abs(endY - startY);
  // Cung nước kiểu rót: bắn ngang ra khỏi cốc của avatar rồi đổ dốc dần xuống miệng cốc.
  const curve = new THREE.CubicBezierCurve3(
    new THREE.Vector3(startX, startY, 0),
    new THREE.Vector3(startX + spread * 0.45, startY - drop * 0.04, 0),
    new THREE.Vector3(endX - spread * 0.05, endY + drop * 0.5, 0),
    new THREE.Vector3(endX, endY, 0),
  );

  const segments = 44;
  const positions = new Float32Array((segments + 1) * 2 * 3);
  const uvs = new Float32Array((segments + 1) * 2 * 2);
  const indices = [];
  const point = new THREE.Vector3();
  const tangent = new THREE.Vector3();

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    curve.getPoint(t, point);
    curve.getTangent(t, tangent);
    // Pháp tuyến trong mặt phẳng XY để dải luôn hướng về camera.
    const len = Math.hypot(tangent.x, tangent.y) || 1;
    const nx = -tangent.y / len;
    const ny = tangent.x / len;
    // Mảnh dần khi nước rơi xuống (dòng chảy nhanh hơn → hẹp hơn).
    const half = THREE.MathUtils.lerp(0.085, 0.038, t);
    const a = i * 6;
    positions[a] = point.x + nx * half;
    positions[a + 1] = point.y + ny * half;
    positions[a + 2] = 0;
    positions[a + 3] = point.x - nx * half;
    positions[a + 4] = point.y - ny * half;
    positions[a + 5] = 0;
    uvs[i * 4] = 0;
    uvs[i * 4 + 1] = t;
    uvs[i * 4 + 2] = 1;
    uvs[i * 4 + 3] = t;
    if (i < segments) {
      const v = i * 2;
      indices.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * Nước rót từ avatar vào cốc: cung nước cong (không phải đường thẳng), chảy dần từ
 * avatar xuống miệng cốc. Thời gian rót tỉ lệ với số ml vừa uống.
 */
function PourStream({ pourIn, pourKey, color, origin }) {
  const meshRef = useRef(null);
  const startedAt = useRef(0);
  const material = useMemo(() => makeStreamMaterial(color, 0), [color]);
  const viewport = useThree((state) => state.viewport);
  const size = useThree((state) => state.size);

  // Điểm rót = mép dưới-phải của avatar (miệng ly của chính chủ), đo từ DOM rồi đổi px → world.
  const px = origin?.x ?? 30;
  const py = origin?.y ?? 30;
  const startX = -viewport.width / 2 + (px / Math.max(1, size.width)) * viewport.width;
  const startY = viewport.height / 2 - (py / Math.max(1, size.height)) * viewport.height;
  const endX = 0.02;
  const endY = BASE_Y + CUP_HEIGHT * 0.9;
  const geometry = useMemo(
    () => makePourGeometry(startX, startY, endX, endY),
    [startX, startY, endX, endY],
  );
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => {
    material.uniforms.uColor.value = new THREE.Color(color);
  }, [material, color]);
  useEffect(() => {
    if (pourKey) startedAt.current = performance.now();
  }, [pourKey]);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const duration = pourSeconds(pourIn);
    const age = (performance.now() - startedAt.current) / 1000;
    const active = pourIn > 0 && age < duration + 0.3;
    // Vào nhanh, giữ đều trong lúc rót, tắt dần sau khi rót xong.
    const fade = !active
      ? 0
      : age < 0.16
        ? age / 0.16
        : age > duration
          ? Math.max(0, 1 - (age - duration) / 0.3)
          : 1;
    material.uniforms.uTime.value = clock.getElapsedTime();
    // Nước chảy từ avatar xuống miệng cốc trong ~0.4s đầu.
    material.uniforms.uReveal.value = Math.min(1, age / 0.4);
    // Dòng càng nhiều ml càng đậm hơn.
    const strength = 0.95 + Math.min(0.05, pourIn / 6000);
    material.uniforms.uOpacity.value = THREE.MathUtils.lerp(
      material.uniforms.uOpacity.value,
      fade * strength,
      0.25,
    );
    mesh.visible = material.uniforms.uOpacity.value > 0.01;
  });

  // z âm: dòng nước nằm SAU cốc nên phần dưới bị cốc che → nước như chui vào miệng cốc.
  return (
    <mesh
      ref={meshRef}
      visible={false}
      position={[0, 0, -0.12]}
      geometry={geometry}
      material={material}
    />
  );
}
/** Vũng nước dưới đáy — to/nhỏ theo số ml bị trừ. */
function SpillPuddle({ spill, spillKey, tiltRef, pourPointRef, color }) {
  const groupRef = useRef(null);
  const ref = useRef(null);
  const ringRef = useRef(null);
  const startedAt = useRef(0);
  useEffect(() => {
    if (spillKey) startedAt.current = performance.now();
  }, [spillKey]);

  useFrame((_, delta) => {
    const m = ref.current;
    if (!m) return;
    const age = (performance.now() - startedAt.current) / 1000;
    const strength = min01(spill / 900);

    // Vũng nằm đúng chỗ dòng nước rơi xuống (bám theo góc nghiêng của cốc).
    const grp = groupRef.current;
    if (grp) {
      const st = tiltRef?.current ?? { rot: 0, x: 0, y: 0 };
      const point = pourPointRef?.current ?? { x: RIM_RADIUS, y: BASE_Y + CUP_HEIGHT * 0.95 };
      const { landX } = spillFromPoint(st, point, strength);
      grp.position.x = THREE.MathUtils.lerp(grp.position.x, landX, Math.min(1, delta * 6));
    }
    // Nước chạm đất sau ~0.55s rồi loang ra, khô dần sau ~3.2s.
    const t = Math.max(0, age - 0.55);
    const visible = spill > 0 && age > 0.5 && age < 5 ? 1 - Math.max(0, (age - 3.2) / 1.8) : 0;
    const grow = 0.55 + Math.min(1, t / 1.1) * 0.45;
    const targetR = visible > 0 ? (0.3 + strength * 1.25) * grow : 0.01;
    const k = Math.min(1, delta * 4);
    m.scale.x = THREE.MathUtils.lerp(m.scale.x, targetR * 1.15, k);
    m.scale.y = THREE.MathUtils.lerp(m.scale.y, targetR * 0.72, k);
    m.material.opacity = THREE.MathUtils.lerp(
      m.material.opacity,
      visible * (0.42 + strength * 0.32),
      Math.min(1, delta * 3),
    );

    // Gợn nước loang trên mặt vũng.
    const ring = ringRef.current;
    if (ring) {
      const phase = t > 0 ? (t % 1.1) / 1.1 : 1;
      const rr = visible > 0 ? targetR * (0.7 + phase * 0.5) : 0.01;
      ring.scale.set(rr * 1.15, rr * 0.72, 1);
      ring.material.opacity = visible * (1 - phase) * 0.3;
    }
  });

  return (
    <group ref={groupRef} position={[0.72, BASE_Y - 0.012, 0.05]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Vũng nước: bầu dục, loang dần */}
      <mesh ref={ref} scale={[0.01, 0.01, 1]}>
        <circleGeometry args={[1, 44]} />
        <meshBasicMaterial color={color} transparent opacity={0} depthWrite={false} />
      </mesh>
      {/* Gợn loang trên mặt vũng */}
      <mesh ref={ringRef} scale={[0.01, 0.01, 1]} position={[0, 0, 0.002]}>
        <ringGeometry args={[0.86, 1, 44]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}
/**
 * Bất kỳ nguồn cốc nào (ảnh tách nền) lỗi tải sẽ rơi về `fallback`
 * thay vì làm sập cả canvas 3D.
 */
class CupBoundary extends Component {
  state = {
    failed: false
  };
  static getDerivedStateFromError() {
    return {
      failed: true
    };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Ly thuỷ tinh mặc định khi chưa có ảnh cốc. */
const glassWaterVertex = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const glassWaterFragment = /* glsl */`
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uAlpha;
  varying vec2 vUv;
  void main() {
    // Hai lớp sóng chạy ngang + dâng dần → nước trong ly trông "sóng sánh".
    float w1 = sin(vUv.x * 24.0 + vUv.y * 7.0 - uTime * 2.2);
    float w2 = sin(vUv.x * 11.0 - vUv.y * 4.0 + uTime * 1.3);
    float caustic = 0.5 + 0.5 * (w1 * 0.6 + w2 * 0.4);
    float depth = smoothstep(0.0, 1.0, vUv.y);
    vec3 col = uColor * (0.6 + 0.55 * depth);
    col += caustic * 0.2 * vec3(0.8, 0.95, 1.0);
    float surf = smoothstep(0.9, 1.0, vUv.y);
    col = mix(col, vec3(1.0), surf * 0.32);
    gl_FragColor = vec4(col, (0.82 + 0.14 * depth + caustic * 0.04) * uAlpha);
  }
`;
const glassSurfaceFragment = /* glsl */`
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uAlpha;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = clamp(length(p), 0.0, 1.0);
    float ripple = sin(r * 24.0 - uTime * 3.4) * 0.5 + 0.5;
    vec3 col = mix(uColor * 1.08, vec3(1.0), 0.16 + ripple * 0.2 + smoothstep(0.62, 1.0, r) * 0.42);
    gl_FragColor = vec4(col, 0.92 * uAlpha);
  }
`;

/** Ly thuỷ tinh mặc định khi chưa có ảnh cốc. */
function GlassCup({ percent, color = '#38bdf8', fillMs = 0, pending = 0, pourPointRef }) {
  const waterRef = useRef(null);
  const surfaceRef = useRef(null);
  const pendingRef = useRef(null);
  const pendingTopRef = useRef(null);
  const fill = useFillTween(percent, fillMs);

  const waterMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uTime: { value: 0 }, uAlpha: { value: 1 } },
    vertexShader: glassWaterVertex,
    fragmentShader: glassWaterFragment,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  }), []);
  // Lớp nước chờ duyệt dùng đúng shader nước nhưng mờ hơn → vẫn thấy nước trong ly.
  const pendingMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uTime: { value: 0 }, uAlpha: { value: 0.72 } },
    vertexShader: glassWaterVertex,
    fragmentShader: glassWaterFragment,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  }), []);
  const pendingSurfMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uTime: { value: 0 }, uAlpha: { value: 0.8 } },
    vertexShader: glassWaterVertex,
    fragmentShader: glassSurfaceFragment,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  }), []);
  const surfaceMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uTime: { value: 0 }, uAlpha: { value: 1 } },
    vertexShader: glassWaterVertex,
    fragmentShader: glassSurfaceFragment,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  }), []);

  useEffect(() => {
    waterMat.uniforms.uColor.value.set(color);
    surfaceMat.uniforms.uColor.value.set(color);
    pendingMat.uniforms.uColor.value.set(color);
    pendingSurfMat.uniforms.uColor.value.set(color);
  }, [color, waterMat, surfaceMat, pendingMat, pendingSurfMat]);
  useEffect(() => () => {
    waterMat.dispose();
    surfaceMat.dispose();
    pendingMat.dispose();
    pendingSurfMat.dispose();
  }, [waterMat, surfaceMat, pendingMat, pendingSurfMat]);
  // Mép phải miệng ly chính là chỗ nước tràn ra.
  useEffect(() => {
    if (pourPointRef) pourPointRef.current = { x: 0.67, y: BASE_Y + CUP_HEIGHT * 0.94 };
  }, [pourPointRef]);

  useFrame(({ clock }, delta) => {
    const mesh = waterRef.current;
    if (!mesh) return;
    const t = clock.getElapsedTime();
    waterMat.uniforms.uTime.value = t;
    surfaceMat.uniforms.uTime.value = t;
    pendingMat.uniforms.uTime.value = t;
    pendingSurfMat.uniforms.uTime.value = t;

    const shown = Math.max(0.06, sampleFill(fill)) * CUP_HEIGHT;
    const k = 1 - Math.exp(-delta * 16);
    mesh.scale.y = THREE.MathUtils.lerp(mesh.scale.y, Math.max(0.001, shown), k);
    mesh.position.y = BASE_Y + mesh.scale.y / 2;

    const surface = surfaceRef.current;
    if (surface) {
      surface.position.y = THREE.MathUtils.lerp(surface.position.y, BASE_Y + mesh.scale.y, k);
      const s = 1 + Math.sin(t * 1.7) * 0.012;
      surface.scale.set(s, s, 1);
      // Chưa có nước đã duyệt thì ẩn mặt nước này (tránh 2 vòng sáng chồng nhau).
      surface.visible = sampleFill(fill) > 0.03;
    }

    // Lớp nước chờ duyệt: mờ, nằm ngay trên mực nước đã duyệt.
    const approved = sampleFill(fill);
    const pendH = Math.max(0, Math.min(0.97, approved + pending) - approved) * CUP_HEIGHT;
    const band = pendingRef.current;
    if (band) {
      band.scale.y = THREE.MathUtils.lerp(band.scale.y, Math.max(0.001, pendH), k);
      band.position.y = BASE_Y + mesh.scale.y + band.scale.y / 2;
    }
    const pendTop = pendingTopRef.current;
    if (pendTop) pendTop.position.y = BASE_Y + mesh.scale.y + (band?.scale.y ?? 0);
  });

  return (
    <group>
      {/* Nước chờ partner duyệt: cùng shader nước nhưng mờ hơn + mặt nước riêng. */}
      <mesh ref={pendingRef} position={[0, BASE_Y, 0]} scale={[1, 0.001, 1]} renderOrder={1} material={pendingMat}>
        <cylinderGeometry args={[0.647, 0.647, 1, 64]} />
      </mesh>
      <mesh ref={pendingTopRef} position={[0, BASE_Y, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2} material={pendingSurfMat}>
        <circleGeometry args={[0.642, 64]} />
      </mesh>

      {/* Nước đã duyệt */}
      <mesh ref={waterRef} position={[0, BASE_Y, 0]} scale={[1, Math.max(0.06, percent) * CUP_HEIGHT, 1]} renderOrder={1} material={waterMat}>
        <cylinderGeometry args={[0.655, 0.655, 1, 64]} />
      </mesh>

      {/* Mặt nước: gợn sáng lan từ tâm ra mép */}
      <mesh ref={surfaceRef} position={[0, BASE_Y, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2} material={surfaceMat}>
        <circleGeometry args={[0.65, 64]} />
      </mesh>

      {/* Thành ly trong suốt */}
      <mesh position={[0, BASE_Y + CUP_HEIGHT / 2, 0]} renderOrder={3}>
        <cylinderGeometry args={[0.70, 0.70, CUP_HEIGHT, 48, 1, true]} />
        <meshPhysicalMaterial
          color="#e0f2fe"
          transparent
          opacity={0.28}
          roughness={0.06}
          metalness={0}
          clearcoat={1}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Vành miệng ly */}
      <mesh position={[0, BASE_Y + CUP_HEIGHT, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={4}>
        <ringGeometry args={[0.62, 0.70, 48]} />
        <meshBasicMaterial color="#bae6fd" transparent opacity={0.8} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Đáy ly */}
      <mesh position={[0, BASE_Y, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
        <circleGeometry args={[0.70, 48]} />
        <meshPhysicalMaterial color="#e0f2fe" transparent opacity={0.55} roughness={0.08} depthWrite={false} />
      </mesh>
    </group>
  );
}
/**
 * Ảnh cốc thật: tách nền ở client rồi dựng thành billboard 3D có độ nghiêng nhẹ.
 * Nếu nền quá phức tạp (không tách được) thì quay về dán texture quanh khối trụ.
 */
function PhotoCup({
  url,
  percent,
  liquidColor,
  fillMs = 0,
  preCut = false,
  pending = 0,
  pourPointRef
}) {
  const [cut, setCut] = useState(null);
  const [unwrapFailed, setUnwrapFailed] = useState(false);
  const [imageMissing, setImageMissing] = useState(false);
  useEffect(() => {
    let alive = true;
    setCut(null);
    setUnwrapFailed(false);
    setImageMissing(false);
    // Ảnh đã tách nền ở server (PNG trong suốt) thì dùng luôn, không chạy model trên máy.
    const job = preCut ? makePreCut(url) : makeCutout(url);
    job
      .then(result => {
        if (!alive) return;
        if (preCut || result.transparentRatio > 0.08) setCut(result);
        else setUnwrapFailed(true);
      })
      .catch(() => {
        if (!alive) return;
        // Ảnh cốc có thể đã bị xoá trên server: probe trước, hỏng thì dùng cốc thủy tinh
        // thay vì WrappedCup (useTexture ném lỗi không bắt được khi URL 404).
        const probe = new Image();
        probe.onload = () => {
          if (alive) setUnwrapFailed(true);
        };
        probe.onerror = () => {
          if (alive) setImageMissing(true);
        };
        probe.src = url;
      });
    return () => {
      alive = false;
    };
  }, [url, preCut]);
  if (unwrapFailed && !imageMissing) return <WrappedCup url={url} percent={percent} />;
  if (!cut || imageMissing) return <GlassCup percent={percent} color={liquidColor} fillMs={fillMs} />;
  return <Suspense fallback={<GlassCup percent={percent} color={liquidColor} fillMs={fillMs} />}>
      <CutoutBillboard cut={cut} percent={percent} liquidColor={liquidColor} fillMs={fillMs} pending={pending} pourPointRef={pourPointRef} />
    </Suspense>;
}

/**
 * Billboard cốc ảnh với shader "nước dâng": đường mặt nước gợn sóng (2 sóng chồng,
 * chạy theo thời gian), mép mềm, có vệt sáng lấp lánh + khúc xạ nhẹ ngay dưới mặt nước.
 * Phần trên mặt nước bị tối & giảm bão hoà thay vì cắt bằng mặt phẳng cứng.
 */
function CutoutBillboard({
  cut,
  percent,
  liquidColor,
  fillMs = 0,
  pending = 0,
  pourPointRef
}) {
  const texture = useTexture(cut.dataUrl);
  const groupRef = useRef(null);
  // Đầy tới sát miệng cốc khi đạt 100% (chừa 3% cho vành/miệng bình).
  const fillPercent = Math.min(0.97, percent);
  const fill = useFillTween(fillPercent, fillMs);
  const height = CUP_HEIGHT;
  const width = Math.min(2.3, Math.max(0.55, height * cut.aspect));
  // Điểm đổ đo từ chính ảnh cốc (mép miệng/vai) → dòng nước bám đúng chỗ cho mọi loại chai/cốc.
  useEffect(() => {
    if (!pourPointRef) return;
    const p = cut.pour ?? { x: 0.85, y: 0.14 };
    pourPointRef.current = {
      x: (p.x - 0.5) * width,
      y: BASE_Y + (1 - p.y) * height,
    };
  }, [cut, width, height, pourPointRef]);
  const material = useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    const texel = new THREE.Vector2(1 / Math.max(1, texture.image?.width ?? 1), 1 / Math.max(1, texture.image?.height ?? 1));
    return new THREE.ShaderMaterial({
      uniforms: {
        uMap: {
          value: texture
        },
        uProgress: {
          value: 0
        },
        uTarget: {
          value: Math.min(0.97, percent)
        },
        uPending: {
          value: 0
        },
        uTime: {
          value: 0
        },
        uWaveAmp: {
          value: 0.055
        },
        uDim: {
          value: 0.72
        },
        uSaturation: {
          value: 0.22
        },
        uTexel: {
          value: texel
        },
        uSharpen: {
          value: 0.3
        },
        uLiquid: {
          value: new THREE.Color(liquidColor ?? cut.liquidColor ?? '#38bdf8')
        }
      },
      vertexShader: billboardVertex,
      fragmentShader: billboardFragment,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });
  }, [texture]);

  // Bóng đổ mềm phía sau ảnh → cốc có cảm giác dày, không còn như sticker.
  const shadowMaterial = useMemo(() => {
    const texel = new THREE.Vector2(1 / Math.max(1, texture.image?.width ?? 1), 1 / Math.max(1, texture.image?.height ?? 1));
    return new THREE.ShaderMaterial({
      uniforms: {
        uMap: {
          value: texture
        },
        uTexel: {
          value: texel
        }
      },
      vertexShader: billboardVertex,
      fragmentShader: billboardShadowFragment,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });
  }, [texture]);
  useEffect(() => {
    material.uniforms.uTarget.value = fillPercent;
  }, [material, fillPercent]);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => shadowMaterial.dispose(), [shadowMaterial]);

  // Mực nước dâng từ từ + sóng chạy liên tục.
  useFrame(({
    clock
  }, delta) => {
    const t = clock.getElapsedTime();
    material.uniforms.uTime.value = t;
    // Mực nước dâng theo đúng thời gian rót (đồng bộ với dòng nước), mượt theo delta.
    const shown = sampleFill(fill);
    const k = 1 - Math.exp(-delta * 16);
    const pendTarget = Math.max(0, Math.min(0.97 - fillPercent, pending));
    const pu = material.uniforms.uPending;
    pu.value = Math.abs(pu.value - pendTarget) < 0.0005 ? pendTarget : pu.value + (pendTarget - pu.value) * k;
    const cur = material.uniforms.uProgress.value;
    material.uniforms.uProgress.value = Math.abs(cur - shown) < 0.0005 ? shown : cur + (shown - cur) * k;
    const group = groupRef.current;
    if (!group) return;
    // Nghiêng rất nhẹ để ảnh phẳng có cảm giác khối, không rung.
    group.rotation.y = Math.sin(t * 0.42) * 0.12;
    group.position.y = Math.sin(t * 0.8) * 0.012;
  });
  return <group ref={groupRef}>
      <mesh position={[0.022, BASE_Y + height / 2 - 0.022, -0.012]} material={shadowMaterial}>
        <planeGeometry args={[width, height]} />
      </mesh>
      <mesh position={[0, BASE_Y + height / 2, 0]} material={material}>
        <planeGeometry args={[width, height]} />
      </mesh>
      <mesh position={[0, BASE_Y + 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[width * 0.36, 48]} />
        <meshBasicMaterial color="#0f172a" transparent opacity={0.09} />
      </mesh>
    </group>;
}
const billboardVertex = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const billboardShadowFragment = /* glsl */`
  uniform sampler2D uMap;
  uniform vec2 uTexel;
  varying vec2 vUv;

  void main() {
    // Bóng = alpha của ảnh được làm mờ bằng 9 mẫu, tô màu xanh đậm rất nhẹ.
    vec2 o = uTexel * 5.0;
    float a = 0.0;
    for (int i = -1; i <= 1; i++) {
      for (int j = -1; j <= 1; j++) {
        a += texture2D(uMap, vUv + vec2(float(i), float(j)) * o).a;
      }
    }
    a /= 9.0;
    gl_FragColor = vec4(vec3(0.06, 0.14, 0.22), a * 0.2);
  }
`;
const billboardFragment = /* glsl */`
  uniform sampler2D uMap;
  uniform float uProgress;
  uniform float uTarget;
  uniform float uPending;
  uniform float uTime;
  uniform float uWaveAmp;
  uniform float uDim;
  uniform float uSaturation;
  uniform vec2 uTexel;
  uniform float uSharpen;
  uniform vec3 uLiquid;
  varying vec2 vUv;

  void main() {
    // Mặt nước: 2 sóng chồng nhau chạy theo thời gian, biên độ nhỏ dần khi gần đầy.
    float amp = uWaveAmp * smoothstep(0.0, 0.06, uTarget);
    float wave =
      sin(vUv.x * 7.0 + uTime * 1.4) * 0.62 +
      sin(vUv.x * 3.1 - uTime * 0.9 + 2.1) * 0.38;
    float water = uProgress + wave * amp;

    float d = vUv.y - water;                 // > 0: phía trên mặt nước
    float above = smoothstep(-0.004, 0.010, d);
    float below = 1.0 - smoothstep(-0.012, 0.012, d);
    float filled = smoothstep(0.004, 0.03, uTarget);
    float band = 1.0 - smoothstep(0.0, 0.05, abs(d));

    // Khúc xạ: phần chìm trong nước bị uốn nhẹ + gợn chạy → thấy rõ là có nước.
    vec2 uv = vUv;
    float wob = sin(vUv.y * 58.0 + uTime * 2.4 + sin(vUv.x * 12.0)) * 0.004 * below * filled;
    uv.x += wob;
    uv.y += sin(vUv.x * 22.0 + uTime * 1.8) * 0.002 * band;
    uv.x += sin(vUv.y * 40.0 - uTime * 2.2) * 0.0025 * band;

    vec4 tex = texture2D(uMap, uv);
    vec3 color = tex.rgb;

    // Làm nét: bù tần số cao cho ảnh nguồn nhỏ khi phóng to trên màn hình.
    vec3 blur =
      texture2D(uMap, uv + vec2(uTexel.x, 0.0)).rgb +
      texture2D(uMap, uv - vec2(uTexel.x, 0.0)).rgb +
      texture2D(uMap, uv + vec2(0.0, uTexel.y)).rgb +
      texture2D(uMap, uv - vec2(0.0, uTexel.y)).rgb;
    color = clamp(color + (color - blur * 0.25) * uSharpen, 0.0, 1.0);

    // Phần chưa uống: tối đi + bớt bão hoà.
    float grey = dot(color, vec3(0.299, 0.587, 0.114));
    vec3 dimmed = mix(color, vec3(grey), uSaturation) * uDim;
    color = mix(color, dimmed, above);

    vec3 tint = uLiquid / max(max(uLiquid.r, uLiquid.g), max(uLiquid.b, 0.001));

    // Nước trong cốc: nhuộm vừa phải để vẫn thấy hoạ tiết trên cốc, sáng dần lên gần mặt nước.
    vec3 waterColor = tint * (0.55 + 0.45 * smoothstep(0.0, max(water, 0.001), vUv.y));
    color = mix(color, color * 0.88 + waterColor * 0.22, below * filled * 0.45);

    // Vân nước chảy trong lòng cốc.
    float caustic =
      sin(vUv.x * 26.0 + uTime * 1.3 + sin(vUv.y * 18.0 - uTime * 0.8)) * 0.5 + 0.5;
    color += caustic * below * filled * 0.09 * tint;

    // Mặt nước: dải sáng rõ, lượn theo sóng.
    float line = 1.0 - smoothstep(0.0, 0.014, abs(d));
    color = mix(color, vec3(1.0) * (0.72 + 0.28 * tint), line * filled * 0.55);
    color += line * filled * 0.1;

    // Lấp lánh chạy trên mặt nước.
    float shimmer = pow(max(0.0, 1.0 - abs(d) * 16.0), 2.0);
    float glint = 0.5 + 0.5 * sin(vUv.x * 20.0 - uTime * 2.6);
    color += shimmer * glint * 0.26 * filled * tint;
    color += band * 0.12 * filled * tint;

    // Dải "chờ duyệt": lớp sáng mờ + gạch chéo nhẹ, có đường mức phía trên.
    float pendTop = min(0.97, water + uPending);
    float pendStep = step(0.001, uPending);
    float inPend = step(water, vUv.y) * (1.0 - smoothstep(pendTop - 0.012, pendTop, vUv.y));
    float stripes = 0.5 + 0.5 * sin((vUv.y - water) * 240.0 + uTime * 1.2 + vUv.x * 9.0);
    color = mix(color, color * 0.94 + tint * 0.12, inPend * pendStep * (0.12 + 0.12 * stripes));
    float pendLine = 1.0 - smoothstep(0.0, 0.008, abs(vUv.y - pendTop));
    color = mix(color, vec3(1.0), pendLine * pendStep * 0.3);

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), tex.a);
  }
`;
const wrapVertex = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const wrapFragment = /* glsl */`
  uniform sampler2D uMap;
  uniform float uProgress;
  uniform float uDim;
  varying vec2 vUv;

  void main() {
    vec3 color = texture2D(uMap, vUv).rgb;
    float aboveWater = smoothstep(uProgress - 0.008, uProgress + 0.008, vUv.y);
    color = mix(color, color * uDim, aboveWater);
    float line = 1.0 - smoothstep(0.0, 0.014, abs(vUv.y - uProgress));
    if (uProgress > 0.01) {
      color = mix(color, min(color * 1.9 + 0.07, vec3(1.0)), line * 0.6);
    }
    gl_FragColor = vec4(color, 1.0);
  }
`;

/** Fallback: dán ảnh quanh khối trụ khi không tách được nền. */
function WrappedCup({
  url,
  percent
}) {
  const texture = useTexture(url);
  const material = useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    return new THREE.ShaderMaterial({
      uniforms: {
        uMap: {
          value: texture
        },
        uProgress: {
          value: percent
        },
        uDim: {
          value: 0.45
        }
      },
      vertexShader: wrapVertex,
      fragmentShader: wrapFragment
    });
  }, [texture]);
  useEffect(() => {
    material.uniforms.uProgress.value = percent;
  }, [material, percent]);
  useEffect(() => () => material.dispose(), [material]);
  return <mesh position={[0, BASE_Y + CUP_HEIGHT / 2, 0]} material={material}>
      <cylinderGeometry args={[0.7, 0.62, CUP_HEIGHT, 64, 1, true]} />
    </mesh>;
}
