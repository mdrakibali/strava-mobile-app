import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import {
  HeatmapTypeOption,
  MapMarkerItem,
  MapStyleKey,
  MapTypeOption,
  TerrainTypeOption,
} from './mapTypes';

interface LeafletMapViewProps {
  centerCoordinate?: [number, number]; // [lon, lat]
  userLocation?: [number, number] | null; // [lon, lat]
  zoomLevel?: number;
  routeCoordinates?: [number, number][]; // Array of [lon, lat]
  markers?: MapMarkerItem[];
  selectedMarkerId?: string;
  styleKey?: MapStyleKey;
  mapType?: MapTypeOption;
  heatmapType?: HeatmapTypeOption;
  terrainType?: TerrainTypeOption;
  is3D?: boolean;
  mode?: 'live-record' | 'view-route' | 'explore';
  followUser?: boolean;
  autoFitRoute?: boolean;
  onMarkerPress?: (marker: MapMarkerItem) => void;
  onMapPress?: (coords: [number, number]) => void;
  showUserLocation?: boolean;
}

export const LeafletMapView: React.FC<LeafletMapViewProps> = ({
  centerCoordinate = [90.4125, 23.7745],
  userLocation,
  zoomLevel = 14,
  routeCoordinates,
  markers = [],
  selectedMarkerId,
  styleKey = 'positron',
  mapType = 'standard',
  mode = 'explore',
  followUser = mode === 'live-record',
  autoFitRoute = mode === 'view-route',
  onMarkerPress,
  onMapPress,
  showUserLocation = true,
}) => {
  const webViewRef = useRef<any>(null);
  const prevRouteLenRef = useRef<number>(0);

  // Determine tile URL based on map type and styleKey (100% Free, Public, No API Key Required)
  const getTileUrl = () => {
    if (mapType === 'satellite' || mapType === 'hybrid') {
      return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    }
    if (mapType === 'winter' || styleKey === 'voyager') {
      return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}';
    }
    if (styleKey === 'dark') {
      return 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
    }
    // Default: OpenStreetMap (Official, 100% Free, NO API Key, High Detail, Zero Watermarks)
    return 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  };

  const effectiveZoom = mode === 'live-record' ? Math.max(zoomLevel, 16) : zoomLevel;
  const initialCenter = userLocation || centerCoordinate;
  const initialLat = initialCenter[1];
  const initialLon = initialCenter[0];

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          html, body, #map {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            background-color: #f3f4f6;
          }
          .user-pulse-dot {
            width: 18px;
            height: 18px;
            background-color: #007AFF;
            border: 3px solid #FFFFFF;
            border-radius: 50%;
            box-shadow: 0 0 0 4px rgba(0, 122, 255, 0.35), 0 2px 6px rgba(0, 0, 0, 0.3);
          }
          .start-pin {
            width: 14px;
            height: 14px;
            background-color: #10B981;
            border: 2px solid #FFFFFF;
            border-radius: 50%;
          }
          .end-pin {
            width: 14px;
            height: 14px;
            background-color: #111827;
            border: 2px solid #FFFFFF;
            border-radius: 50%;
          }
          .route-marker-pin {
            background-color: #FC4C02;
            color: #FFFFFF;
            font-size: 10px;
            font-weight: bold;
            padding: 3px 8px;
            border-radius: 12px;
            border: 2px solid #FFFFFF;
            box-shadow: 0 2px 4px rgba(0,0,0,0.25);
            white-space: nowrap;
          }
          .leaflet-control-attribution {
            font-size: 8px !important;
            background: rgba(255,255,255,0.7) !important;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var isFollowingUser = ${followUser ? 'true' : 'false'};
          var mode = '${mode}';
          var autoFitDefault = ${autoFitRoute ? 'true' : 'false'};

          var map = L.map('map', {
            zoomControl: false,
            attributionControl: true
          }).setView([${initialLat}, ${initialLon}], ${effectiveZoom});

          var tileLayer = L.tileLayer('${getTileUrl()}', {
            maxZoom: 19,
            attribution: '© OpenStreetMap · © Esri'
          }).addTo(map);

          var userMarker = null;
          var routePolyline = null;
          var routeCasing = null;
          var startMarker = null;
          var endMarker = null;
          var markerLayers = [];

          function updateUserLocation(lat, lon, autoPan) {
            if (!userMarker) {
              var userIcon = L.divIcon({
                className: 'user-pulse-dot',
                iconSize: [18, 18],
                iconAnchor: [9, 9]
              });
              userMarker = L.marker([lat, lon], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
            } else {
              userMarker.setLatLng([lat, lon]);
            }

            if (autoPan && isFollowingUser) {
              // Smooth, continuous pan without jumping or changing zoom
              map.panTo([lat, lon], { animate: true, duration: 0.6, easeLinearity: 0.25 });
            }
          }

          function addLivePoint(lat, lon) {
            if (!routePolyline) {
              routeCasing = L.polyline([[lat, lon]], {
                color: '#FFFFFF',
                weight: 7,
                opacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round'
              }).addTo(map);

              routePolyline = L.polyline([[lat, lon]], {
                color: '#FC4C02',
                weight: 4.5,
                opacity: 1.0,
                lineCap: 'round',
                lineJoin: 'round'
              }).addTo(map);

              var startIcon = L.divIcon({ className: 'start-pin', iconSize: [14, 14], iconAnchor: [7, 7] });
              startMarker = L.marker([lat, lon], { icon: startIcon }).addTo(map);
            } else {
              routePolyline.addLatLng([lat, lon]);
              routeCasing.addLatLng([lat, lon]);
            }
          }

          function setCenter(lat, lon, zoom) {
            isFollowingUser = false;
            map.flyTo([lat, lon], zoom || map.getZoom(), { duration: 0.8 });
          }

          function recenterToUser(lat, lon, zoom) {
            isFollowingUser = true;
            map.setView([lat, lon], zoom || ${effectiveZoom}, { animate: true, duration: 0.5 });
          }

          function drawRoute(coords, fit) {
            if (routePolyline) map.removeLayer(routePolyline);
            if (routeCasing) map.removeLayer(routeCasing);
            if (startMarker) map.removeLayer(startMarker);
            if (endMarker) map.removeLayer(endMarker);

            if (!coords || coords.length < 2) return;

            routeCasing = L.polyline(coords, {
              color: '#FFFFFF',
              weight: 7,
              opacity: 0.9,
              lineCap: 'round',
              lineJoin: 'round'
            }).addTo(map);

            routePolyline = L.polyline(coords, {
              color: '#FC4C02',
              weight: 4.5,
              opacity: 1.0,
              lineCap: 'round',
              lineJoin: 'round'
            }).addTo(map);

            var startIcon = L.divIcon({ className: 'start-pin', iconSize: [14, 14], iconAnchor: [7, 7] });
            var endIcon = L.divIcon({ className: 'end-pin', iconSize: [14, 14], iconAnchor: [7, 7] });

            startMarker = L.marker(coords[0], { icon: startIcon }).addTo(map);
            endMarker = L.marker(coords[coords.length - 1], { icon: endIcon }).addTo(map);

            if (fit) {
              map.fitBounds(routePolyline.getBounds(), { padding: [30, 30] });
            }
          }

          function setMarkers(markersList) {
            markerLayers.forEach(function(m) { map.removeLayer(m); });
            markerLayers = [];

            markersList.forEach(function(item) {
              var icon = L.divIcon({
                className: 'route-marker-pin',
                html: item.title || '',
                iconSize: [80, 20],
                iconAnchor: [40, 10]
              });
              var m = L.marker([item.lat, item.lon], { icon: icon }).addTo(map);
              m.on('click', function() {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'MARKER_PRESS',
                  id: item.id
                }));
              });
              markerLayers.push(m);
            });
          }

          // Stop auto-following if the user manually drags the map
          map.on('dragstart', function() {
            isFollowingUser = false;
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'USER_PANNED' }));
          });

          map.on('click', function(e) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'MAP_PRESS',
              coords: [e.latlng.lng, e.latlng.lat]
            }));
          });

          // Initial Render
          ${showUserLocation && userLocation ? `updateUserLocation(${userLocation[1]}, ${userLocation[0]}, false);` : ''}
          ${
            routeCoordinates && routeCoordinates.length >= 2
              ? `drawRoute(${JSON.stringify(routeCoordinates.map((c) => [c[1], c[0]]))}, ${autoFitRoute ? 'true' : 'false'});`
              : ''
          }
          ${
            markers.length > 0
              ? `setMarkers(${JSON.stringify(
                  markers.map((m) => ({
                    id: m.id,
                    title: m.title,
                    lat: m.coordinate[1],
                    lon: m.coordinate[0],
                  }))
                )});`
              : ''
          }
        </script>
      </body>
    </html>
  `;

  // Sync routeCoordinates update smoothly
  useEffect(() => {
    if (!webViewRef.current || !routeCoordinates || routeCoordinates.length === 0) return;

    if (mode === 'live-record') {
      const curLen = routeCoordinates.length;
      if (curLen > prevRouteLenRef.current && curLen > 1) {
        // Incremental: only add the new point, DO NOT rebuild polyline or fitBounds
        const latest = routeCoordinates[curLen - 1];
        const js = `addLivePoint(${latest[1]}, ${latest[0]}); true;`;
        webViewRef.current.injectJavaScript(js);
      } else if (prevRouteLenRef.current === 0 && curLen >= 2) {
        // Initial route setup
        const latLon = routeCoordinates.map((c) => [c[1], c[0]]);
        const js = `drawRoute(${JSON.stringify(latLon)}, false); true;`;
        webViewRef.current.injectJavaScript(js);
      }
      prevRouteLenRef.current = curLen;
    } else {
      // In static or view-route mode
      if (routeCoordinates.length >= 2) {
        const latLon = routeCoordinates.map((c) => [c[1], c[0]]);
        const js = `drawRoute(${JSON.stringify(latLon)}, ${autoFitRoute ? 'true' : 'false'}); true;`;
        webViewRef.current.injectJavaScript(js);
      }
    }
  }, [routeCoordinates, mode, autoFitRoute]);

  // Sync userLocation update smoothly
  useEffect(() => {
    if (webViewRef.current && userLocation && showUserLocation) {
      const autoPan = mode === 'live-record' && followUser;
      const js = `updateUserLocation(${userLocation[1]}, ${userLocation[0]}, ${autoPan ? 'true' : 'false'}); true;`;
      webViewRef.current.injectJavaScript(js);
    }
  }, [userLocation?.[0], userLocation?.[1], showUserLocation, mode, followUser]);

  // Sync tile URL / styleKey update
  useEffect(() => {
    if (webViewRef.current) {
      const js = `
        if (tileLayer) {
          tileLayer.setUrl('${getTileUrl()}');
        }
        true;
      `;
      webViewRef.current.injectJavaScript(js);
    }
  }, [styleKey, mapType]);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'MARKER_PRESS' && onMarkerPress) {
        const found = markers.find((m) => m.id === data.id);
        if (found) onMarkerPress(found);
      } else if (data.type === 'MAP_PRESS' && onMapPress) {
        onMapPress(data.coords);
      }
    } catch {
      // Ignore malformed message
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scalesPageToFit={true}
        scrollEnabled={false}
        style={styles.webView}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  webView: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
});
