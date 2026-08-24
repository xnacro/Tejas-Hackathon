import React, { useState, useEffect } from "react";
import io from "socket.io-client";

import { LocationProvider } from "./context/LocationContext";
import { NavigationProvider } from "./context/NavigationContext";
import { TrafficSafetyProvider } from "./context/TrafficSafetyContext";
import { PerceptionProvider } from "./context/PerceptionContext";
import Header from "./components/Header";
import PerceptionPipelineStatusStrip from "./components/PerceptionPipelineStatusStrip";
import CenterNav from "./components/CenterNav";
import Lidar3DViewer from "./components/Lidar3DViewer";
import AdaptivePathRadarCard from "./components/AdaptivePathRadarCard";
import RoadObjectDetectionCard from "./components/RoadObjectDetectionCard";
import DriverMonitoringCard from "./components/DriverMonitoringCard";



import VehicleInfoCard from "./components/VehicleInfoCard";
import TodaySummaryCard from "./components/TodaySummaryCard";
import LiveNavigationCard from "./components/LiveNavigationCard";
import TrafficSafetyCard from "./components/TrafficSafetyCard";
import NearbyServicesCard from "./components/NearbyServicesCard";
import BottomActionStrip from "./components/BottomActionStrip";

// Modals
import SosEmergencyModal from "./components/modals/SosEmergencyModal";
import TrafficRulesModal from "./components/modals/TrafficRulesModal";
import CommunityModal from "./components/modals/CommunityModal";
import ShareLocationModal from "./components/modals/ShareLocationModal";
import RestAreaModal from "./components/modals/RestAreaModal";
import NotificationsModal from "./components/modals/NotificationsModal";

function DashboardContent() {
  const [activeTab, setActiveTab] = useState("dashboard");

  // Driver & Vehicle State
  const [profile, setProfile] = useState({
    name: "Rajesh Kumar",
    role: "Truck Driver",
    vehicleNumber: "UP 32 BK 8921",
    vehicleType: "Tata Prima 4028.S",
    weather: { temp: "28°C" },
    notificationsCount: 3,
    notifications: []
  });

  const [telemetry, setTelemetry] = useState({
    speed: 52,
    speedLimit: 60,
    currentRoad: "NH 44",
    fuelLevel: 62,
    engineTemp: 87,
    tripDistance: 234.8,
    todaySummary: {
      drivingTime: "04h 32m",
      alerts: 2,
      topSpeed: 78,
      safetyScore: 92
    }
  });

  // AI Drowsiness State (Default: Alert 18%)
  const [aiState, setAiState] = useState({
    drowsinessScore: 18,
    state: "ALERT",
    stateLabel: "Alert",
    statusMessage: "You are Alert. Keep driving safely!",
    alertLevel: 0,
    indicators: {
      eyes: "Open",
      yawning: "No",
      headPose: "Normal"
    }
  });

  // Nearby Services & SOS Data
  const [services, setServices] = useState([]);
  const [sosInfo, setSosInfo] = useState(null);
  const [locationSharingActive, setLocationSharingActive] = useState(true);

  // Modals state
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isCommunityOpen, setIsCommunityOpen] = useState(false);
  const [isShareLocationOpen, setIsShareLocationOpen] = useState(false);
  const [isRestAreaOpen, setIsRestAreaOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Fetch initial data from Express backend & setup Socket.io
  useEffect(() => {
    // 1. Initial REST calls
    fetch("/api/driver/profile")
      .then(res => res.json())
      .then(data => setProfile(data))
      .catch(err => console.warn("Driver profile fallback:", err));

    fetch("/api/vehicle/telemetry")
      .then(res => res.json())
      .then(data => setTelemetry(data))
      .catch(err => console.warn("Telemetry fallback:", err));

    fetch("/api/services/nearby")
      .then(res => res.json())
      .then(data => setServices(data))
      .catch(err => console.warn("Services fallback:", err));

    fetch("/api/sos/info")
      .then(res => res.json())
      .then(data => setSosInfo(data))
      .catch(err => console.warn("SOS info fallback:", err));

    // 2. Connect Socket.io
    const socket = io("http://localhost:5000", {
      transports: ["websocket", "polling"]
    });

    socket.on("telemetry:update", (updated) => {
      setTelemetry(prev => ({ ...prev, ...updated }));
    });

    socket.on("ai:drowsiness:update", (data) => {
      setAiState(data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleReduceSpeed = () => {
    const newSpeed = 58;
    setTelemetry(prev => ({ ...prev, speed: newSpeed }));
    fetch("/api/vehicle/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ speed: newSpeed })
    }).catch(e => console.warn(e));
  };

  return (
    <div className="min-h-screen xl:h-screen w-full flex flex-col justify-between p-2.5 sm:p-3.5 max-w-[1680px] mx-auto select-none font-sans">
      {/* 1. Header */}
      <Header
        profile={profile}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
      />

      {/* 1.5 Real-Time Perception Pipeline Status Strip */}
      <div className="my-1 shrink-0">
        <PerceptionPipelineStatusStrip />
      </div>

      {/* 2. Main Multi-Page Menu Cockpit Grid */}
      {activeTab === "lidar" ? (
        /* Dedicated LiDAR 3D Perception & Path Planning Hub (SIH26037) */
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 flex-1 my-1 items-stretch">
          {/* Main Area: Full-Width 3D LiDAR Viewer (8 Cols) */}
          <div className="lg:col-span-8 xl:col-span-8 flex flex-col justify-between">
            <div className="relative w-full h-[580px] rounded-3xl overflow-hidden glass-panel border border-white shadow-xl bg-slate-950 flex flex-col">
              <Lidar3DViewer />
            </div>
          </div>


          {/* Center Nav Column (1 Col) */}
          <div className="hidden xl:flex xl:col-span-1 justify-center items-center">
            <CenterNav
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onOpenSos={() => setIsSosOpen(true)}
              onOpenTrafficRules={() => setIsRulesOpen(true)}
              onOpenCommunity={() => setIsCommunityOpen(true)}
            />
          </div>

          {/* Right Column: AI Perception Radar & Vehicle Telemetry (3 Cols) */}
          <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-3.5 justify-start">
            <AdaptivePathRadarCard />
            <div className="grid grid-cols-2 gap-3.5">
              <VehicleInfoCard telemetry={telemetry} />
              <TodaySummaryCard summary={telemetry?.todaySummary} />
            </div>
          </div>
        </main>
      ) : activeTab === "road_cv" ? (
        /* Dedicated Road Computer Vision & Object Tracking View */
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 my-2 items-stretch">
          <div className="lg:col-span-8 xl:col-span-8 flex flex-col justify-start">
            <RoadObjectDetectionCard />
          </div>

          {/* Center Nav Column (1 Col) */}
          <div className="hidden xl:flex xl:col-span-1 justify-center items-center">
            <CenterNav
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onOpenSos={() => setIsSosOpen(true)}
              onOpenTrafficRules={() => setIsRulesOpen(true)}
              onOpenCommunity={() => setIsCommunityOpen(true)}
            />
          </div>

          <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-3.5 justify-start">
            <AdaptivePathRadarCard />
            <div className="grid grid-cols-2 gap-3.5">
              <VehicleInfoCard telemetry={telemetry} />
              <TodaySummaryCard summary={telemetry?.todaySummary} />
            </div>
          </div>
        </main>
      ) : activeTab === "monitoring" ? (
        /* Dedicated Driver AI Monitoring & Fatigue Center */
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 my-2 items-stretch">
          <div className="lg:col-span-7 xl:col-span-7 flex flex-col justify-start">
            <DriverMonitoringCard
              aiState={aiState}
              setAiState={setAiState}
              onTriggerRestArea={() => setIsRestAreaOpen(true)}
            />
          </div>


          {/* Center Nav Column (1 Col) */}
          <div className="hidden xl:flex xl:col-span-1 justify-center items-center">
            <CenterNav
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onOpenSos={() => setIsSosOpen(true)}
              onOpenTrafficRules={() => setIsRulesOpen(true)}
              onOpenCommunity={() => setIsCommunityOpen(true)}
            />
          </div>

          <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-3.5 justify-start">
            <div className="grid grid-cols-2 gap-3.5">
              <VehicleInfoCard telemetry={telemetry} />
              <TodaySummaryCard summary={telemetry?.todaySummary} />
            </div>
            <NearbyServicesCard
              services={services}
              onSelectService={() => {}}
              onViewAll={() => setIsRulesOpen(true)}
            />
          </div>
        </main>
      ) : (
        /* Main Cockpit Dashboard View */
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 my-2 items-stretch">
          {/* Left Column: Driver Monitoring + Vehicle Info + Today's Summary (4 Cols) */}
          <div className="lg:col-span-4 flex flex-col gap-3.5 justify-between">
            <DriverMonitoringCard
              aiState={aiState}
              setAiState={setAiState}
              onTriggerRestArea={() => setIsRestAreaOpen(true)}
            />

            <div className="grid grid-cols-2 gap-3.5">
              <VehicleInfoCard telemetry={telemetry} />
              <TodaySummaryCard summary={telemetry?.todaySummary} />
            </div>
          </div>

          {/* Center Nav Column (1 Col on Large Screens) */}
          <div className="hidden xl:flex xl:col-span-1 justify-center items-center">
            <CenterNav
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onOpenSos={() => setIsSosOpen(true)}
              onOpenTrafficRules={() => setIsRulesOpen(true)}
              onOpenCommunity={() => setIsCommunityOpen(true)}
            />
          </div>

          {/* Center Column: Live Navigation Map (4-5 Cols) */}
          <div className="lg:col-span-4 xl:col-span-4 flex flex-col justify-between">
            <LiveNavigationCard
              onEndTrip={() => alert("Trip completed. Drive safely with ADAPT-INDIA!")}
            />
          </div>

          {/* Right Column: Traffic & Safety + Nearby Services (3-4 Cols) */}
          <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-3.5 justify-between">
            <TrafficSafetyCard
              telemetry={telemetry}
              onReduceSpeed={handleReduceSpeed}
              onOpenRules={() => setIsRulesOpen(true)}
            />

            <NearbyServicesCard
              services={services}
              onSelectService={() => {}}
              onViewAll={() => setIsRulesOpen(true)}
            />
          </div>
        </main>
      )}


      {/* 3. Bottom Action Strip (SOS Emergency, Share Location, Community) */}
      <BottomActionStrip
        onOpenSos={() => setIsSosOpen(true)}
        onOpenShareLocation={() => setIsShareLocationOpen(true)}
        onOpenCommunity={() => setIsCommunityOpen(true)}
        locationSharingActive={locationSharingActive}
        contactsCount={2}
        nearbyDriversCount={12}
      />

      {/* Interactive Modals */}
      <SosEmergencyModal
        isOpen={isSosOpen}
        onClose={() => setIsSosOpen(false)}
        sosInfo={sosInfo}
      />

      <TrafficRulesModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
      />

      <CommunityModal
        isOpen={isCommunityOpen}
        onClose={() => setIsCommunityOpen(false)}
      />

      <ShareLocationModal
        isOpen={isShareLocationOpen}
        onClose={() => setIsShareLocationOpen(false)}
      />

      <RestAreaModal
        isOpen={isRestAreaOpen}
        onClose={() => setIsRestAreaOpen(false)}
        onNavigate={() => {}}
      />

      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={profile?.notifications}
      />
    </div>
  );
}

export default function App() {
  return (
    <LocationProvider>
      <NavigationProvider>
        <TrafficSafetyProvider>
          <PerceptionProvider>
            <DashboardContent />
          </PerceptionProvider>
        </TrafficSafetyProvider>
      </NavigationProvider>
    </LocationProvider>
  );
}

