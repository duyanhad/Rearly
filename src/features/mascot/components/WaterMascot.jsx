import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Linh vật giọt nước 3D.
 * - Thân giọt nước béo (sphere biến dạng thành giọt), mắt to có tròng, miệng, tay, chân, má hồng.
 * - Biểu cảm + phụ kiện theo bậc tiến hoá (xem tiers.js).
 * - `evolving` = true → chạy animation biến hoá: co lại, loé sáng, phóng to, đổi màu.
 */

const EYES = {
  happy: { open: 0.85, tilt: 0.12, pupil: 1.0, brow: 0.02 },
  determined: { open: 0.7, tilt: -0.12, pupil: 0.95, brow: -0.14 },
  excited: { open: 1.0, tilt: 0.18, pupil: 1.12, brow: 0.1 },
  calm: { open: 0.76, tilt: 0.05, pupil: 0.96, brow: 0.0 },
  proud: { open: 0.72, tilt: 0.1, pupil: 1.0, brow: -0.06 },
  fierce: { open: 0.7, tilt: -0.16, pupil: 0.92, brow: -0.2 },
  noble: { open: 0.74, tilt: 0.08, pupil: 1.0, brow: -0.04 },
  serene: { open: 0.68, tilt: 0.03, pupil: 0.94, brow: 0.04 },
  divine: { open: 1.0, tilt: 0.14, pupil: 1.08, brow: 0.06 },
};

const MOUTH = {
  happy: { curve: 0.06, width: 0.16, open: 0.02 },
  determined: { curve: -0.01, width: 0.13, open: 0.03 },
  excited: { curve: 0.09, width: 0.2, open: 0.07 },
  calm: { curve: 0.04, width: 0.14, open: 0.015 },
  proud: { curve: 0.05, width: 0.15, open: 0.02 },
  fierce: { curve: -0.03, width: 0.14, open: 0.045 },
  noble: { curve: 0.04, width: 0.13, open: 0.02 },
  serene: { curve: 0.03, width: 0.12, open: 0.015 },
  divine: { curve: 0.08, width: 0.17, open: 0.05 },
};

/** Thân giọt nước: sphere kéo đỉnh thành mũi nhọn mềm, đáy phình cho "mập". */
function dropGeometry() {
  const geo = new THREE.SphereGeometry(1, 64, 48);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 1) {
    v.fromBufferAttribute(pos, i);
    const t = (v.y + 1) / 2; // 0 đáy, 1 đỉnh
    // đỉnh thuôn dần, đáy nở rộng
    const taper = 1 - Math.pow(t, 2.2) * 0.62;
    v.x *= taper * 1.16;
    v.z *= taper * 1.1;
    v.y = v.y * 1.12 + Math.pow(t, 4) * 0.36;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

const sharedDrop = typeof window === 'undefined' ? null : dropGeometry();

function Blob({ expression, palette, evolving }) {
  const matRef = useRef();
  const grpRef = useRef();
  const inner = useRef();
  const target = useMemo(() => new THREE.Color(palette.body), [palette.body]);
  const deep = useMemo(() => new THREE.Color(palette.deep), [palette.deep]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const g = grpRef.current;
    if (!g) return;

    // Thở nhẹ + lắc lư
    const breathe = 1 + Math.sin(t * 1.9) * 0.022;
    g.scale.set(breathe, 2 - breathe, breathe);
    g.rotation.z = Math.sin(t * 1.15) * 0.045;
    g.position.y = Math.sin(t * 1.6) * 0.035;

    // Nhún theo biểu cảm
    const bounce = expression === 'excited' || expression === 'divine' ? 0.075 : 0.03;
    g.position.y += Math.abs(Math.sin(t * (expression === 'excited' ? 4.2 : 2.6))) * bounce * 0.5;

    if (matRef.current) {
      const k = Math.min(1, delta * 3.2);
      matRef.current.color.lerp(target, k);
      if (matRef.current.emissive) matRef.current.emissive.lerp(deep, k);
      matRef.current.emissiveIntensity = evolving
        ? 1.2 + Math.sin(t * 22) * 0.9
        : 0.28 + Math.sin(t * 2.1) * 0.06;
    }
    if (inner.current) {
      inner.current.rotation.y += delta * 0.6;
    }
  });

  return (
    <group ref={grpRef}>
      <mesh geometry={sharedDrop} castShadow>
        <meshPhysicalMaterial
          ref={matRef}
          color={palette.body}
          roughness={0.12}
          metalness={0.05}
          clearcoat={1}
          clearcoatRoughness={0.08}
          transmission={0.12}
          thickness={1.2}
          emissive={palette.deep}
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Lõi sáng bên trong cho cảm giác nước trong (dùng màu đậm để không thành đốm trắng) */}
      <mesh ref={inner} scale={0.55} position={[0, 0.12, 0]}>
        <sphereGeometry args={[1, 24, 18]} />
        <meshBasicMaterial color={palette.deep} transparent opacity={0.18} />
      </mesh>

      {/* Vệt highlight */}
      <mesh position={[-0.34, 0.62, 0.62]} rotation={[0, 0, -0.5]} scale={[0.22, 0.4, 0.1]}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.55} />
      </mesh>
    </group>
  );
}

function Eyes({ expression, palette }) {
  const conf = EYES[expression] ?? EYES.happy;
  // Mí mắt không khép quá nửa, nếu không tròng đen sẽ lòi ra ngoài.
  const open = Math.max(0.68, conf.open);
  const ref = useRef();
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ref.current) {
      ref.current.position.y = Math.sin(t * 1.8) * 0.006;
      // chớp mắt tự nhiên
      const blink = Math.sin(t * 0.7) > 0.985 ? 0.12 : 1;
      ref.current.scale.y = blink;
    }
  });

  return (
    <group ref={ref} position={[0, 0.34, 0.98]}>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.36, 0, 0]} rotation={[0, 0, side * -conf.tilt]}>
          <mesh scale={[0.27, 0.3 * open, 0.16]}>
            <sphereGeometry args={[1, 32, 24]} />
            <meshPhysicalMaterial color="#ffffff" roughness={0.05} clearcoat={1} />
          </mesh>
          <mesh position={[0, -0.02, 0.12]} scale={[0.15 * conf.pupil, 0.17 * conf.pupil * open, 0.1]}>
            <sphereGeometry args={[1, 24, 18]} />
            <meshStandardMaterial color="#16324a" roughness={0.15} />
          </mesh>
          <mesh position={[0.04, 0.05, 0.19]} scale={0.055}>
            <sphereGeometry args={[1, 12, 10]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          {/* lông mày: dương = nhướng (hiền), âm = cau (dữ) — phải đối xứng hai bên */}
          <mesh position={[0, 0.32, 0.04]} rotation={[0, 0, side * -(conf.brow + 0.05)]} scale={[0.2, 0.055, 0.06]}>
            <capsuleGeometry args={[1, 1, 6, 10]} />
            <meshStandardMaterial color={palette.deep} roughness={0.4} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Mouth({ expression }) {
  const conf = MOUTH[expression] ?? MOUTH.happy;
  // Miệng mở (phấn khích) vẽ thành hình bầu dục; gần như thẳng thì vẽ nét ngang; còn lại vẽ nét cong.
  if (conf.open > 0.03) {
    return (
      <group position={[0, -0.32, 1.06]}>
        <mesh scale={[conf.width * 1.4, conf.open * 2.1, 1]}>
          <circleGeometry args={[1, 28]} />
          <meshBasicMaterial color="#12324a" />
        </mesh>
        {conf.curve > 0 ? (
          <mesh position={[0, -conf.open * 1.1, 0.02]} scale={[conf.width * 0.9, conf.open * 0.75, 1]}>
            <circleGeometry args={[1, 20]} />
            <meshBasicMaterial color="#ff7a9c" />
          </mesh>
        ) : null}
      </group>
    );
  }
  if (Math.abs(conf.curve) <= 0.02) {
    return (
      <mesh position={[0, -0.16, 1.08]} scale={[conf.width * 1.6, 0.028, 0.03]}>
        <capsuleGeometry args={[1, 1, 6, 12]} />
        <meshBasicMaterial color="#17364d" />
      </mesh>
    );
  }
  return (
    <group position={[0, -0.22, 1.08]}>
      {/* nửa vòng tròn: cong lên = cười, cong xuống = nghiêm */}
      <mesh
        rotation={[0, 0, conf.curve > 0 ? Math.PI : 0]}
        scale={[conf.width * 2.2, conf.width * 2.2, 1]}
      >
        <torusGeometry args={[0.52, 0.06, 8, 28, Math.PI]} />
        <meshBasicMaterial color="#17364d" />
      </mesh>
    </group>
  );
}

function Cheeks() {
  return (
    <group position={[0, 0.1, 1.02]}>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.66, 0, 0.08]} scale={[0.15, 0.09, 0.05]}>
          <sphereGeometry args={[1, 16, 12]} />
          <meshBasicMaterial color="#ff9ec4" transparent opacity={0.55} />
        </mesh>
      ))}
    </group>
  );
}

/** Cánh tay: một ống + bàn tay tròn, gắn ngoài thân để nhìn rõ. */
function MascotArm({ side, innerRef, color, palette, armored }) {
  return (
    <group ref={innerRef} position={[side * 1.0, 0.02, 0.16]} rotation={[0, 0, side * 0.9]}>
      <mesh position={[0, -0.3, 0]} scale={[0.155, 0.32, 0.155]}>
        <capsuleGeometry args={[1, 1, 8, 16]} />
        <meshPhysicalMaterial color={color} roughness={0.3} clearcoat={0.8} />
      </mesh>
      <mesh position={[0, -0.64, 0]} scale={0.19}>
        <sphereGeometry args={[1, 20, 16]} />
        <meshPhysicalMaterial color={palette.body} roughness={0.2} clearcoat={1} />
      </mesh>
      {armored && (
        <mesh position={[0, -0.22, 0]} scale={[0.17, 0.2, 0.17]}>
          <sphereGeometry args={[1, 18, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#8fd8ff" metalness={0.85} roughness={0.25} />
        </mesh>
      )}
    </group>
  );
}

function Limbs({ expression, palette, accessories }) {
  const wave = useRef();
  const legL = useRef();
  const legR = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (wave.current) {
      const swinging = expression === 'excited' || expression === 'divine' || expression === 'happy';
      wave.current.rotation.z = -0.75 - (swinging ? Math.sin(t * 3.1) * 0.5 : Math.sin(t * 1.4) * 0.18);
    }
    if (legL.current) legL.current.rotation.x = Math.sin(t * 2.4) * 0.16;
    if (legR.current) legR.current.rotation.x = Math.sin(t * 2.4 + Math.PI) * 0.16;
  });

  const armColor = accessories.includes('armor') ? palette.accent : palette.deep;
  const shoeColor = palette.deep;

  return (
    <group>
      <MascotArm side={-1} innerRef={wave} color={armColor} palette={palette} armored={accessories.includes('armor')} />
      <MascotArm side={1} color={armColor} palette={palette} armored={accessories.includes('armor')} />

      {/* chân */}
      {[-1, 1].map((side) => (
        <group key={side} ref={side === -1 ? legL : legR} position={[side * 0.38, -1.02, 0.08]}>
          <mesh position={[0, -0.1, 0]} scale={[0.13, 0.16, 0.13]}>
            <capsuleGeometry args={[1, 1, 8, 16]} />
            <meshPhysicalMaterial color={palette.deep} roughness={0.3} clearcoat={0.9} />
          </mesh>
          <mesh position={[0, -0.24, 0.08]} scale={[0.2, 0.11, 0.26]}>
            <sphereGeometry args={[1, 20, 16]} />
            <meshPhysicalMaterial color={shoeColor} roughness={0.35} clearcoat={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Phụ kiện theo bậc — mỗi bậc cộng dồn vài món. */
function Accessories({ list, palette }) {
  const halo = useRef();
  const wingsL = useRef();
  const wingsR = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // Vòng hào quang đung đưa quanh trục dọc (xoay trong mặt phẳng sẽ làm nó lật nghiêng).
    if (halo.current) halo.current.rotation.y = Math.sin(t * 0.9) * 0.22;
    if (wingsL.current) wingsL.current.rotation.y = -0.5 + Math.sin(t * 2.6) * 0.22;
    if (wingsR.current) wingsR.current.rotation.y = 0.5 - Math.sin(t * 2.6) * 0.22;
  });

  return (
    <group>
      {list.includes('halo') && (
        <group ref={halo} position={[0, 1.72, 0]} rotation={[Math.PI / 2 - 0.38, 0, 0]}>
          <mesh>
            <torusGeometry args={[0.42, 0.032, 12, 48]} />
            <meshStandardMaterial color="#ffe9a3" emissive="#ffd166" emissiveIntensity={1.4} metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
      )}

      {list.includes('crown') && (
        <group position={[0, 0.98, 0]}>
          <mesh>
            <cylinderGeometry args={[0.64, 0.6, 0.14, 16, 1, true]} />
            <meshStandardMaterial color="#ffd166" emissive="#ffb703" emissiveIntensity={0.5} metalness={1} roughness={0.2} side={THREE.DoubleSide} />
          </mesh>
          {Array.from({ length: 6 }).map((_, i) => {
            const a = (i / 6) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.cos(a) * 0.62, 0.13, Math.sin(a) * 0.62]} scale={0.055}>
                <coneGeometry args={[1, 2.2, 8]} />
                <meshStandardMaterial color="#fff4c2" emissive="#ffd166" emissiveIntensity={0.8} metalness={1} roughness={0.15} />
              </mesh>
            );
          })}
        </group>
      )}

      {list.includes('wings') && (
        <group position={[0, 0.35, -0.55]}>
          {[-1, 1].map((side) => (
            <group key={side} ref={side === -1 ? wingsL : wingsR}>
              {[0, 1, 2].map((i) => (
                <mesh
                  key={i}
                  position={[side * (1.0 + i * 0.24), 0.3 - i * 0.22, 0.02 * i]}
                  rotation={[0.2, side * 0.7, side * (0.45 + i * 0.24)]}
                  scale={[0.66 - i * 0.08, 0.26 - i * 0.03, 0.05]}
                >
                  <sphereGeometry args={[1, 16, 12]} />
                  <meshPhysicalMaterial
                    color={palette.glow}
                    transparent
                    opacity={0.6}
                    roughness={0.05}
                    clearcoat={1}
                    side={THREE.DoubleSide}
                  />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      )}

      {list.includes('cape') && (
        <mesh position={[0, -0.15, -1.05]} rotation={[0.12, 0, 0]} scale={[1.15, 1.3, 0.25]}>
          <sphereGeometry args={[1, 24, 18, 0, Math.PI * 2, 0, Math.PI / 1.7]} />
          <meshPhysicalMaterial color={palette.deep} roughness={0.5} transparent opacity={0.82} side={THREE.DoubleSide} />
        </mesh>
      )}

      {list.includes('gem') && (
        <mesh position={[0, -0.72, 1.02]} rotation={[0, 0, Math.PI / 4]}>
          <octahedronGeometry args={[0.17, 0]} />
          <meshPhysicalMaterial color="#8ef7ff" emissive="#22d3ee" emissiveIntensity={1.3} metalness={0.4} roughness={0.05} />
        </mesh>
      )}

      {list.includes('rings') && (
        <group>
          {[0, 1].map((i) => (
            <mesh
              key={i}
              position={[0, -0.8 - i * 0.3, 0]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <torusGeometry args={[1.42 + i * 0.3, 0.018, 8, 64]} />
              <meshBasicMaterial color={i === 0 ? palette.glow : '#ffffff'} transparent opacity={0.75} />
            </mesh>
          ))}
        </group>
      )}

      {list.includes('shards') && (
        <group>
          {Array.from({ length: 6 }).map((_, i) => {
            const a = (i / 6) * Math.PI * 2;
            return (
              <mesh
                key={i}
                position={[Math.cos(a) * 1.45, 0.6 + Math.sin(a * 1.7) * 0.45, Math.sin(a) * 0.7 - 0.25]}
                rotation={[a, a * 0.6, 0]}
                scale={[0.055, 0.2, 0.055]}
              >
                <octahedronGeometry args={[1, 0]} />
                <meshPhysicalMaterial color={palette.glow} emissive={palette.deep} emissiveIntensity={0.8} metalness={0.5} roughness={0.1} />
              </mesh>
            );
          })}
        </group>
      )}

      {list.includes('stars') && <StarField palette={palette} />}
    </group>
  );
}

function StarField({ palette }) {
  const ref = useRef();
  const stars = useMemo(() => {
    // Bộ sinh giả ngẫu nhiên cố định để vị trí sao không nhảy mỗi lần render.
    let seed = 7;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    return Array.from({ length: 14 }).map(() => ({
      p: [(rand() - 0.5) * 3.1, rand() * 2.4 - 0.4, (rand() - 0.5) * 1.6 - 0.3],
      s: 0.02 + rand() * 0.045,
      phase: rand() * Math.PI * 2,
    }));
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    ref.current?.children.forEach((star, i) => {
      const { phase } = stars[i];
      const pulse = 0.55 + Math.sin(t * 2.4 + phase) * 0.45;
      star.scale.setScalar(stars[i].s * (0.7 + pulse * 0.7));
      star.position.y = stars[i].p[1] + Math.sin(t * 0.9 + phase) * 0.12;
    });
  });

  return (
    <group ref={ref}>
      {stars.map((star, i) => (
        <mesh key={i} position={star.p} scale={star.s}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color={i % 3 === 0 ? '#ffffff' : palette.glow} transparent opacity={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/** Vòng xung kích khi biến hoá. */
function EvolveBurst({ active }) {
  const ref = useRef();
  const lightRef = useRef();
  const born = useRef(0);

  useEffect(() => {
    if (active) born.current = performance.now();
  }, [active]);

  useFrame(() => {
    if (!ref.current) return;
    const age = (performance.now() - born.current) / 1000;
    const on = active && age < 1.4;
    ref.current.visible = on;
    if (lightRef.current) lightRef.current.intensity = on ? 6 * (1 - age / 1.4) : 0;
    if (!on) return;
    const k = age / 1.4;
    ref.current.scale.setScalar(0.4 + k * 3.4);
    ref.current.material.opacity = Math.max(0, 0.85 * (1 - k));
  });

  return (
    <group>
      <mesh ref={ref} position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.7, 0.82, 64]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
      <pointLight ref={lightRef} position={[0, 0.5, 1.2]} intensity={0} color="#a5f3fc" distance={8} />
    </group>
  );
}

function MascotModel({ tier, evolving, hovered }) {
  const group = useRef();
  const evoStart = useRef(0);
  const conf = tier;

  useEffect(() => {
    if (evolving) evoStart.current = performance.now();
  }, [evolving]);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const target = conf.scale ?? 1;

    // Bậc càng cao linh vật càng to → đẩy camera ra vừa đủ để không bị cắt đỉnh
    // (khoảng cách tính từ chiều cao thật của model + quầng, theo fov dọc).
    const halfFov = ((state.camera.fov ?? 38) * Math.PI) / 360;
    const needZ = (1.85 * target) / Math.tan(halfFov);
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, Math.max(5.2, needZ), Math.min(1, delta * 4));
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, 0.12 + (target - 1) * 0.5, Math.min(1, delta * 4));

    if (evolving) {
      // Biến hoá: co nhỏ → bật lên → lắc → ổn định
      const k = Math.min(1, (performance.now() - evoStart.current) / 2200);
      const squeeze = k < 0.28 ? 1 - k * 1.4 : k < 0.62 ? 0.6 + (k - 0.28) * 1.9 : 1;
      g.scale.set(target * squeeze * (1 + Math.sin(t * 18) * 0.05), target * squeeze, target * squeeze);
      g.rotation.y = t * 2.2;
      g.position.y = Math.sin(t * 7) * 0.18;
    } else {
      const k = Math.min(1, delta * 4);
      g.scale.lerp(new THREE.Vector3(target, target, target), k);
      g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, Math.sin(t * 0.5) * 0.22, k);
      // Lơ lửng nhẹ, rê chuột thì nhún mạnh hơn
      g.position.y = THREE.MathUtils.lerp(g.position.y, Math.sin(t * 1.5) * (hovered ? 0.14 : 0.07), k);
    }
  });

  return (
    <group ref={group}>
      <Blob expression={conf.expression} palette={conf.palette} evolving={evolving} />
      <Eyes expression={conf.expression} palette={conf.palette} />
      <Mouth expression={conf.expression} />
      <Cheeks />
      <Limbs expression={conf.expression} palette={conf.palette} accessories={conf.accessories} />
      <Accessories list={conf.accessories} palette={conf.palette} />
      <EvolveBurst active={evolving} />
    </group>
  );
}

/** Khung canvas hiển thị linh vật. */
export function WaterMascot({
  tier,
  evolving = false,
  height = 'h-56',
  interactive = true,
  className = '',
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div className={`${height} w-full ${className}`}>
      <Canvas
        camera={{ position: [0, 0.15, 5.1], fov: 38 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        onPointerEnter={() => interactive && setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <ambientLight intensity={0.85} />
        <directionalLight position={[3, 4.5, 3.5]} intensity={1.5} />
        <directionalLight position={[-3, 1.5, -2]} intensity={0.55} color="#bfe9ff" />
        <pointLight position={[0, -2, 2.5]} intensity={0.5} color={tier.palette.deep} />
        <MascotModel tier={tier} evolving={evolving} hovered={hovered} />
      </Canvas>
    </div>
  );
}

export default WaterMascot;
