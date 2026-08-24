import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { 
  Eye, 
  Layers, 
  RotateCcw, 
  Zap, 
  AlertTriangle, 
  ShieldCheck, 
  Info, 
  Compass, 
  ChevronRight,
  Maximize2,
  Minimize2,
  Crosshair,
  Sliders
} from "lucide-react";
import { usePerception } from "../context/PerceptionContext";
import { generateLidarScanPoints, DISTANCE_RINGS_METERS } from "../utils/lidarSimulation";

export default function Lidar3DViewer({ isFullScreen = false, onToggleFullScreen }) {
  const mountRef = useRef(null);
  const {
    objects,
    selectedObjectId,
    setSelectedObjectId,
    selectedObject,
    lidarLayers,
    toggleLidarLayer,
    pathPlan,
    egoVehicle,
    scenarioStep
  } = usePerception();

  const [cameraPreset, setCameraPreset] = useState("CHASE"); // 'CHASE' | 'TOP_DOWN' | 'COCKPIT' | 'ISOMETRIC'
  const [showControlsDrawer, setShowControlsDrawer] = useState(false);
  const [fps, setFps] = useState(60);

  // Three.js internal references
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const pointCloudMeshRef = useRef(null);
  const scanBeamRef = useRef(null);
  const bboxesGroupRef = useRef(null);
  const pathLinesGroupRef = useRef(null);
  const animationFrameIdRef = useRef(null);
  const scanAngleRef = useRef(0);

  // Mouse drag Orbit Controls state
  const isDraggingRef = useRef(false);
  const isPanningRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const cameraDistanceRef = useRef(26);
  const cameraPitchRef = useRef(0.65); // elevation angle rad
  const cameraYawRef = useRef(0.0);   // azimuth angle rad
  const cameraTargetRef = useRef(new THREE.Vector3(0, 8, 0));

  // Initialize Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 450;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070b14); // Deep dark LiDAR space
    scene.fog = new THREE.FogExp2(0x070b14, 0.018);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(52, width / height, 0.5, 120);
    cameraRef.current = camera;

    // Set initial Chase Camera position
    updateCameraPosition();

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = false;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x60a5fa, 1.2);
    dirLight.position.set(10, 30, 20);
    scene.add(dirLight);

    // 5. Unstructured Indian Road Surface Grid (Lane-Free Environment)
    const roadWidth = 7.4;
    const roadLength = 55;
    const roadGeo = new THREE.PlaneGeometry(roadWidth, roadLength, 20, 40);
    const roadMat = new THREE.MeshBasicMaterial({
      color: 0x0f172a,
      wireframe: false,
      side: THREE.DoubleSide
    });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.position.set(0, -0.38, roadLength / 2 - 2);
    scene.add(roadMesh);

    // Drivable Area Grid Wireframe (Indian Unstructured Drivable Corridor)
    const gridGeo = new THREE.PlaneGeometry(roadWidth, roadLength, 12, 35);
    const gridMat = new THREE.MeshBasicMaterial({
      color: 0x065f46,
      wireframe: true,
      transparent: true,
      opacity: 0.35
    });
    const gridMesh = new THREE.Mesh(gridGeo, gridMat);
    gridMesh.rotation.x = -Math.PI / 2;
    gridMesh.position.set(0, -0.37, roadLength / 2 - 2);
    scene.add(gridMesh);

    // 6. Distance Concentric Rings (10m, 20m, 30m, 40m)
    const ringsGroup = new THREE.Group();
    DISTANCE_RINGS_METERS.forEach(radius => {
      const ringGeo = new THREE.RingGeometry(radius - 0.08, radius + 0.08, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x1e3a8a,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.set(0, -0.36, 0);
      ringsGroup.add(ringMesh);
    });
    scene.add(ringsGroup);

    // 7. Ego Vehicle 3D Model at Origin (0,0,0)
    const egoGroup = new THREE.Group();
    
    // Vehicle body
    const bodyGeo = new THREE.BoxGeometry(1.85, 0.85, 4.2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x2563eb,
      metalness: 0.7,
      roughness: 0.3,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.2
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.set(0, 0.2, 0);
    egoGroup.add(bodyMesh);

    // Roof & Cabin
    const cabinGeo = new THREE.BoxGeometry(1.5, 0.65, 2.2);
    const cabinMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.1
    });
    const cabinMesh = new THREE.Mesh(cabinGeo, cabinMat);
    cabinMesh.position.set(0, 0.8, -0.3);
    egoGroup.add(cabinMesh);

    // LiDAR Roof Sensor Dome
    const lidarDomeGeo = new THREE.CylinderGeometry(0.2, 0.22, 0.25, 16);
    const lidarDomeMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.6
    });
    const lidarDome = new THREE.Mesh(lidarDomeGeo, lidarDomeMat);
    lidarDome.position.set(0, 1.25, -0.2);
    egoGroup.add(lidarDome);

    // Vehicle Headlights Beams
    const headlightLeft = new THREE.SpotLight(0x93c5fd, 3.5, 25, Math.PI / 6, 0.4);
    headlightLeft.position.set(-0.7, 0.3, 2.0);
    headlightLeft.target.position.set(-0.7, -0.3, 15);
    egoGroup.add(headlightLeft);
    egoGroup.add(headlightLeft.target);

    const headlightRight = new THREE.SpotLight(0x93c5fd, 3.5, 25, Math.PI / 6, 0.4);
    headlightRight.position.set(0.7, 0.3, 2.0);
    headlightRight.target.position.set(0.7, -0.3, 15);
    egoGroup.add(headlightRight);
    egoGroup.add(headlightRight.target);

    scene.add(egoGroup);

    // 8. Rotating LiDAR Scanning Beam Cone / Sweep Line
    const scanBeamGeo = new THREE.BufferGeometry();
    const beamVertices = new Float32Array([0, 1.25, -0.2, 0, -0.35, 35]);
    scanBeamGeo.setAttribute("position", new THREE.BufferAttribute(beamVertices, 3));
    const scanBeamMat = new THREE.LineBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.8,
      linewidth: 2
    });
    const scanBeam = new THREE.Line(scanBeamGeo, scanBeamMat);
    scene.add(scanBeam);
    scanBeamRef.current = scanBeam;

    // 9. Point Cloud Buffer Geometry
    const scanData = generateLidarScanPoints(objects);
    const pointGeo = new THREE.BufferGeometry();
    pointGeo.setAttribute("position", new THREE.BufferAttribute(scanData.positions, 3));
    pointGeo.setAttribute("color", new THREE.BufferAttribute(scanData.colors, 3));

    const pointMat = new THREE.PointsMaterial({
      size: 0.16,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true
    });
    const pointCloud = new THREE.Points(pointGeo, pointMat);
    scene.add(pointCloud);
    pointCloudMeshRef.current = pointCloud;

    // 10. Groups for Bounding Boxes and Paths
    const bboxesGroup = new THREE.Group();
    scene.add(bboxesGroup);
    bboxesGroupRef.current = bboxesGroup;

    const pathLinesGroup = new THREE.Group();
    scene.add(pathLinesGroup);
    pathLinesGroupRef.current = pathLinesGroup;

    // Animation Loop
    let lastTime = performance.now();
    let frameCount = 0;

    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);

      const now = performance.now();
      frameCount++;
      if (now - lastTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = now;
      }

      // Rotate LiDAR beam (10 Hz = 3600 deg/sec)
      scanAngleRef.current += 0.085;
      if (scanBeamRef.current) {
        const radius = 38;
        const bx = Math.sin(scanAngleRef.current) * radius;
        const by = Math.cos(scanAngleRef.current) * radius;
        const positions = scanBeamRef.current.geometry.attributes.position.array;
        positions[3] = bx;
        positions[4] = -0.35;
        positions[5] = by;
        scanBeamRef.current.geometry.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      renderer.dispose();
    };
  }, []);

  // Update Camera based on Orbit controls / Presets
  const updateCameraPosition = () => {
    if (!cameraRef.current) return;
    const cam = cameraRef.current;
    const target = cameraTargetRef.current;
    const dist = cameraDistanceRef.current;
    const pitch = cameraPitchRef.current;
    const yaw = cameraYawRef.current;

    const cx = target.x + dist * Math.cos(pitch) * Math.sin(yaw);
    const cy = target.y + dist * Math.sin(pitch);
    const cz = target.z - dist * Math.cos(pitch) * Math.cos(yaw);

    cam.position.set(cx, cy, cz);
    cam.lookAt(target);
  };

  // Switch camera preset
  const applyCameraPreset = (preset) => {
    setCameraPreset(preset);
    if (preset === "CHASE") {
      cameraDistanceRef.current = 24;
      cameraPitchRef.current = 0.58;
      cameraYawRef.current = 0.0;
      cameraTargetRef.current.set(0, 10, 0);
    } else if (preset === "TOP_DOWN") {
      cameraDistanceRef.current = 38;
      cameraPitchRef.current = 1.54; // near 90 deg straight down
      cameraYawRef.current = 0.0;
      cameraTargetRef.current.set(0, 14, 0);
    } else if (preset === "COCKPIT") {
      cameraDistanceRef.current = 6;
      cameraPitchRef.current = 0.22;
      cameraYawRef.current = 0.0;
      cameraTargetRef.current.set(0, 1.2, 8);
    } else if (preset === "ISOMETRIC") {
      cameraDistanceRef.current = 32;
      cameraPitchRef.current = 0.75;
      cameraYawRef.current = 0.75;
      cameraTargetRef.current.set(0, 12, 0);
    }
    updateCameraPosition();
  };

  // Mouse Orbit Event Handlers
  const handleMouseDown = (e) => {
    if (e.button === 0) isDraggingRef.current = true;
    if (e.button === 2) isPanningRef.current = true;
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current && !isPanningRef.current) return;
    const deltaX = e.clientX - previousMousePositionRef.current.x;
    const deltaY = e.clientY - previousMousePositionRef.current.y;

    if (isDraggingRef.current) {
      cameraYawRef.current -= deltaX * 0.007;
      cameraPitchRef.current = Math.max(0.1, Math.min(1.54, cameraPitchRef.current + deltaY * 0.007));
    } else if (isPanningRef.current) {
      cameraTargetRef.current.x -= deltaX * 0.03;
      cameraTargetRef.current.z += deltaY * 0.03;
    }

    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    updateCameraPosition();
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    isPanningRef.current = false;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    cameraDistanceRef.current = Math.max(4, Math.min(70, cameraDistanceRef.current + e.deltaY * 0.025));
    updateCameraPosition();
  };

  // Dynamic 3D Bounding Boxes & Trajectories Sync
  useEffect(() => {
    if (!bboxesGroupRef.current || !pathLinesGroupRef.current || !sceneRef.current) return;

    // 1. Clear previous 3D objects & paths
    while (bboxesGroupRef.current.children.length > 0) {
      const obj = bboxesGroupRef.current.children[0];
      bboxesGroupRef.current.remove(obj);
    }

    while (pathLinesGroupRef.current.children.length > 0) {
      const obj = pathLinesGroupRef.current.children[0];
      pathLinesGroupRef.current.remove(obj);
    }

    // 2. Render 3D Object Bounding Boxes
    if (lidarLayers.detectedObjects) {
      objects.forEach(obj => {
        const { x, y, z = 0 } = obj.position;
        const { width = 1.0, length = 1.0, height = 1.6 } = obj.dimensions;
        const isHigh = obj.risk === "HIGH";
        const isMed = obj.risk === "MEDIUM";
        const isSelected = obj.id === selectedObjectId;

        const boxColor = isHigh ? 0xef4444 : isMed ? 0xf59e0b : 0x38bdf8;

        // 3D Wireframe Bounding Box BoxHelper
        const boxGeo = new THREE.BoxGeometry(width, height, length);
        const edgesGeo = new THREE.EdgesGeometry(boxGeo);
        const lineMat = new THREE.LineBasicMaterial({
          color: boxColor,
          linewidth: isSelected ? 3 : 1.5
        });
        const wireframeBox = new THREE.LineSegments(edgesGeo, lineMat);
        wireframeBox.position.set(x, z + height / 2 - 0.35, y);
        bboxesGroupRef.current.add(wireframeBox);

        // Semi-transparent solid fill box for high risk
        if (isHigh || isSelected) {
          const fillMat = new THREE.MeshBasicMaterial({
            color: boxColor,
            transparent: true,
            opacity: isHigh ? 0.22 : 0.12
          });
          const fillMesh = new THREE.Mesh(boxGeo, fillMat);
          fillMesh.position.set(x, z + height / 2 - 0.35, y);
          bboxesGroupRef.current.add(fillMesh);
        }

        // Predicted Trajectory Ribbon for each object
        if (lidarLayers.predictedTrajectories && obj.trajectory && obj.trajectory.length > 1) {
          const trajPoints = obj.trajectory.map(p => new THREE.Vector3(p.x, -0.34, p.y));
          const trajGeo = new THREE.BufferGeometry().setFromPoints(trajPoints);
          const trajMat = new THREE.LineDashedMaterial({
            color: boxColor,
            dashSize: 0.6,
            gapSize: 0.3,
            linewidth: 2
          });
          const trajLine = new THREE.Line(trajGeo, trajMat);
          trajLine.computeLineDistances();
          bboxesGroupRef.current.add(trajLine);
        }
      });
    }

    // 3. Render Vehicle Adaptive Path Planning Splines
    if (lidarLayers.adaptivePath && pathPlan) {
      // A. Nominal Baseline Path (Dashed White)
      if (pathPlan.nominalPath && pathPlan.nominalPath.length > 1) {
        const nomPoints = pathPlan.nominalPath.map(p => new THREE.Vector3(p.x, -0.32, p.y));
        const nomGeo = new THREE.BufferGeometry().setFromPoints(nomPoints);
        const nomMat = new THREE.LineDashedMaterial({
          color: 0x94a3b8,
          dashSize: 0.8,
          gapSize: 0.4,
          linewidth: 1.5,
          transparent: true,
          opacity: 0.6
        });
        const nomLine = new THREE.Line(nomGeo, nomMat);
        nomLine.computeLineDistances();
        pathLinesGroupRef.current.add(nomLine);
      }

      // B. Adaptive Avoidance Path (Glowing Emerald / Cyan Ribbon)
      if (pathPlan.adaptivePath && pathPlan.adaptivePath.length > 1) {
        const adaptPoints = pathPlan.adaptivePath.map(p => new THREE.Vector3(p.x, -0.30, p.y));
        const adaptGeo = new THREE.BufferGeometry().setFromPoints(adaptPoints);
        const isAvoidanceActive = pathPlan.status === "REPLANNING" || pathPlan.status === "NEW_SAFE_PATH";
        const adaptMat = new THREE.LineBasicMaterial({
          color: isAvoidanceActive ? 0x10b981 : 0x38bdf8,
          linewidth: 4
        });
        const adaptLine = new THREE.Line(adaptGeo, adaptMat);
        pathLinesGroupRef.current.add(adaptLine);

        // Path waypoint spheres
        adaptPoints.forEach((pt, idx) => {
          if (idx % 3 === 0) {
            const sphereGeo = new THREE.SphereGeometry(0.12, 8, 8);
            const sphereMat = new THREE.MeshBasicMaterial({
              color: isAvoidanceActive ? 0x34d399 : 0x60a5fa
            });
            const sphere = new THREE.Mesh(sphereGeo, sphereMat);
            sphere.position.copy(pt);
            pathLinesGroupRef.current.add(sphere);
          }
        });
      }
    }

    // 4. Update Point Cloud points
    if (pointCloudMeshRef.current) {
      pointCloudMeshRef.current.visible = lidarLayers.pointCloud;
      const scanData = generateLidarScanPoints(objects);
      pointCloudMeshRef.current.geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(scanData.positions, 3)
      );
      pointCloudMeshRef.current.geometry.setAttribute(
        "color",
        new THREE.BufferAttribute(scanData.colors, 3)
      );
      pointCloudMeshRef.current.geometry.attributes.position.needsUpdate = true;
      pointCloudMeshRef.current.geometry.attributes.color.needsUpdate = true;
    }
  }, [objects, selectedObjectId, lidarLayers, pathPlan]);

  return (
    <div className="relative w-full h-full min-h-[380px] lg:min-h-[460px] rounded-3xl overflow-hidden glass-panel border border-white shadow-xl bg-slate-950 flex flex-col justify-between">
      {/* 1. Main 3D Canvas Mounting Point with Mouse Drag Listeners */}
      <div
        ref={mountRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* 2. Top-Left HUD: Mode & Autonomous Status */}
      <div className="relative z-20 p-3.5 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-900/90 border border-emerald-500/40 text-white shadow-lg backdrop-blur-md">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-black tracking-wider uppercase">LiDAR 3D Perception</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
              10 Hz • 40m
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900/80 border border-white/10 text-[11px] font-mono text-slate-300 backdrop-blur-md">
            <span>{fps} FPS</span>
          </div>
        </div>

        {/* Top-Right Preset Buttons & Fullscreen */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {/* Camera Preset Switchers */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-900/90 border border-white/15 backdrop-blur-md shadow-lg">
            <button
              onClick={() => applyCameraPreset("CHASE")}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                cameraPreset === "CHASE" ? "bg-blue-600 text-white shadow-xs" : "text-slate-400 hover:text-white"
              }`}
              title="Chase / Follow 3D View"
            >
              Chase
            </button>
            <button
              onClick={() => applyCameraPreset("TOP_DOWN")}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                cameraPreset === "TOP_DOWN" ? "bg-blue-600 text-white shadow-xs" : "text-slate-400 hover:text-white"
              }`}
              title="Top-Down Bird's Eye View"
            >
              Top-Down
            </button>
            <button
              onClick={() => applyCameraPreset("COCKPIT")}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                cameraPreset === "COCKPIT" ? "bg-blue-600 text-white shadow-xs" : "text-slate-400 hover:text-white"
              }`}
              title="Driver Cockpit POV"
            >
              Cockpit
            </button>
            <button
              onClick={() => applyCameraPreset("ISOMETRIC")}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                cameraPreset === "ISOMETRIC" ? "bg-blue-600 text-white shadow-xs" : "text-slate-400 hover:text-white"
              }`}
              title="Isometric 3D Perspective"
            >
              3D Iso
            </button>
          </div>

          {/* Reset Orbit */}
          <button
            onClick={() => applyCameraPreset(cameraPreset)}
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-white/15 text-slate-300 hover:text-white transition-all shadow-md cursor-pointer"
            title="Reset Camera Center"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Layer Controls Toggle */}
          <button
            onClick={() => setShowControlsDrawer(!showControlsDrawer)}
            className={`p-2 rounded-xl border transition-all shadow-md cursor-pointer ${
              showControlsDrawer ? "bg-blue-600 border-blue-500 text-white" : "bg-slate-900/90 border-white/15 text-slate-300 hover:text-white"
            }`}
            title="Toggle Perception Layers"
          >
            <Layers className="w-4 h-4" />
          </button>

          {onToggleFullScreen && (
            <button
              onClick={onToggleFullScreen}
              className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-white/15 text-slate-300 hover:text-white transition-all shadow-md cursor-pointer"
              title={isFullScreen ? "Exit Fullscreen" : "Fullscreen View"}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* 3. Layer Toggles Overlay Drawer (Collapsible) */}
      {showControlsDrawer && (
        <div className="absolute top-16 right-3.5 z-30 w-60 p-3 rounded-2xl bg-slate-950/95 border border-white/20 shadow-2xl backdrop-blur-xl space-y-2 animate-in fade-in zoom-in-95 text-slate-200">
          <div className="flex items-center justify-between text-xs font-bold border-b border-slate-800 pb-1.5">
            <span className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-blue-400" /> 3D Layer Overlays
            </span>
            <span className="text-[10px] text-slate-400 font-mono">SIH26037</span>
          </div>

          <div className="space-y-1.5 text-xs font-medium">
            <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-900/80 cursor-pointer">
              <span>Point Cloud (10 Hz)</span>
              <input
                type="checkbox"
                checked={lidarLayers.pointCloud}
                onChange={() => toggleLidarLayer("pointCloud")}
                className="accent-blue-500 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-900/80 cursor-pointer">
              <span>3D Bounding Boxes</span>
              <input
                type="checkbox"
                checked={lidarLayers.detectedObjects}
                onChange={() => toggleLidarLayer("detectedObjects")}
                className="accent-blue-500 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-900/80 cursor-pointer">
              <span>Predicted Trajectories</span>
              <input
                type="checkbox"
                checked={lidarLayers.predictedTrajectories}
                onChange={() => toggleLidarLayer("predictedTrajectories")}
                className="accent-blue-500 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-900/80 cursor-pointer">
              <span>Adaptive Path Spline</span>
              <input
                type="checkbox"
                checked={lidarLayers.adaptivePath}
                onChange={() => toggleLidarLayer("adaptivePath")}
                className="accent-emerald-500 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-900/80 cursor-pointer">
              <span>Distance Rings (10-40m)</span>
              <input
                type="checkbox"
                checked={lidarLayers.distanceRings}
                onChange={() => toggleLidarLayer("distanceRings")}
                className="accent-blue-500 rounded cursor-pointer"
              />
            </label>
          </div>
        </div>
      )}

      {/* 4. Center-Left Adaptive Path Status Pill */}
      <div className="relative z-20 px-3.5 pointer-events-none">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-900/90 border border-white/20 text-white shadow-xl backdrop-blur-md">
          {pathPlan.status === "SAFE_PATH" && (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <span className="text-xs font-black text-emerald-400">SAFE PATH</span>
            </>
          )}
          {pathPlan.status === "RISK_DETECTED" && (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
              <span className="text-xs font-black text-amber-400">RISK DETECTED</span>
            </>
          )}
          {pathPlan.status === "REPLANNING" && (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              <span className="text-xs font-black text-rose-400">REPLANNING (+1.35m Swerve)</span>
            </>
          )}
          {pathPlan.status === "NEW_SAFE_PATH" && (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <span className="text-xs font-black text-emerald-400">NEW SAFE PATH ENGAGED</span>
            </>
          )}
          <span className="text-[10px] text-slate-400 border-l border-slate-700 pl-2">
            Speed: {egoVehicle.speedKmh} km/h
          </span>
        </div>
      </div>

      {/* 5. Bottom Interactive Object Inspection Strip */}
      <div className="relative z-20 p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pointer-events-none">
        {/* Object Quick Switcher Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none pointer-events-auto">
          {objects.map(obj => {
            const isSelected = obj.id === selectedObjectId;
            const isHigh = obj.risk === "HIGH";
            return (
              <button
                key={obj.id}
                onClick={() => setSelectedObjectId(obj.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-105"
                    : isHigh
                    ? "bg-rose-950/80 border border-rose-500/40 text-rose-300"
                    : "bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-slate-300"
                }`}
              >
                <span>{obj.type}</span>
                <span className="font-mono text-[9px] opacity-80">{obj.distance}m</span>
              </button>
            );
          })}
        </div>

        {/* Selected Object Detailed Telemetry Card */}
        {selectedObject && (
          <div className="flex items-center justify-between sm:justify-end gap-3 px-3.5 py-2 rounded-2xl bg-slate-900/95 border border-white/20 text-white shadow-2xl backdrop-blur-xl pointer-events-auto text-xs">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${
                selectedObject.risk === "HIGH" ? "bg-rose-500 animate-ping" : selectedObject.risk === "MEDIUM" ? "bg-amber-400" : "bg-emerald-400"
              }`}></div>
              <div>
                <strong className="font-bold">{selectedObject.name}</strong>
                <div className="text-[10px] text-slate-400 font-mono">
                  Track {selectedObject.trackId} • Azimuth: {selectedObject.relativeDirection}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 border-l border-slate-800 pl-3">
              <div className="text-right">
                <div className="font-mono font-extrabold text-blue-400">{selectedObject.distance} m</div>
                <div className="text-[9px] text-slate-400">Distance</div>
              </div>

              <div className="text-right">
                <div className="font-mono font-bold text-slate-200">{selectedObject.velocityMs} m/s</div>
                <div className="text-[9px] text-slate-400">Velocity</div>
              </div>

              <div className="text-right">
                <div className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                  selectedObject.risk === "HIGH" ? "bg-rose-500/20 text-rose-400 border border-rose-500/40" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                }`}>
                  {selectedObject.risk} RISK
                </div>
                <div className="text-[9px] text-slate-400">{Math.round(selectedObject.confidence * 100)}% Conf</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
