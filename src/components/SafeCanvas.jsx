import { Component } from 'react';
import { Canvas } from '@react-three/fiber';

/**
 * Safari/iOS giới hạn số WebGL context (khoảng 8–16). Khi vượt, `@react-three/fiber`
 * ném "Error creating WebGL context" và làm trắng cả app.
 * Bọc Canvas trong boundary: lỗi WebGL chỉ làm mất khối 3D, phần còn lại vẫn dùng được.
 */
class GlBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.warn('[3D] Không tạo được WebGL, dùng bản 2D:', error?.message);
  }

  render() {
    if (this.state.failed) return this.props.fallback ?? null;
    return this.props.children;
  }
}

/** Canvas 3D an toàn: tự hạ tải GPU và rơi về 2D nếu máy không cấp được WebGL. */
export function SafeCanvas({ fallback = null, dpr = [1, 1.6], gl, children, ...rest }) {
  return (
    <GlBoundary fallback={fallback}>
      <Canvas
        dpr={dpr}
        gl={{ antialias: false, powerPreference: 'high-performance', ...gl }}
        onCreated={({ gl: renderer }) => {
          // Khi driver thu hồi context (iOS hay gặp), đánh dấu để không crash.
          renderer.domElement.addEventListener?.(
            'webglcontextlost',
            (event) => {
              event.preventDefault();
              console.warn('[3D] WebGL context bị mất, chờ khôi phục');
            },
            { once: true },
          );
          rest.onCreated?.({ gl: renderer });
        }}
        {...rest}
      >
        {children}
      </Canvas>
    </GlBoundary>
  );
}

export default SafeCanvas;
