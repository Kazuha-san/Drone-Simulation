/**
 * Static Bhopal map visual/design constants — depot, terrain contours,
 * airport, road overlays. This is decorative geography for the canvas
 * renderer, NOT simulation output, and is NOT touched by the real-data
 * integration: keep this file exactly as the frontend author designed it.
 *
 * NOTE for integration: MAP_CONFIG.width/height (canvas units) is a design
 * constant independent of the backend's CityGraph canvas space
 * (2000x2000 units, see engine/graph.py CityGraph.SCALE_M_PER_UNIT). Real
 * node x/y coordinates from data/bhopal_map.json will need rescaling to
 * this canvas's coordinate space before being drawn — see INTEGRATION.md.
 */
/**
 * Centralized Mock Simulation Data Layer
 * Designed for effortless drop-in replacement with real Python simulation output:
 * - bhopal_map.json
 * - trace.json
 * - drone_specs.json
 */

export const MAP_CONFIG = {
  width: 2400,
  height: 1600,
  depot: {
    id: "depot-tt-nagar",
    name: "TT Nagar Logistics Depot",
    shortLabel: "TT NAGAR DEPOT",
    x: 1180,
    y: 860,
    elevation: 520,
    chargingPads: 4,
    operationalRadius: 540 // Visual operational radius (approx 5.5km)
  },
  // Stylized Bhopal Elevation & Hill Contour Bands
  terrainContours: [
    {
      id: "shyamla-ridge",
      name: "Shyamla Hills Ridge",
      elevation: "550m",
      points: [[640, 290], [710, 330], [800, 360], [850, 440], [860, 560], [830, 680], [740, 750]]
    },
    {
      id: "idgah-hills",
      name: "Idgah Hills Ridge",
      elevation: "540m",
      points: [[840, 220], [960, 240], [1080, 270], [1200, 290], [1300, 320]]
    },
    {
      id: "arera-hills",
      name: "Arera Hills Ridge",
      elevation: "535m",
      points: [[1360, 660], [1440, 700], [1500, 780], [1480, 880], [1420, 940]]
    },
    {
      id: "shahpura-ridge",
      name: "Shahpura Ridge",
      elevation: "515m",
      points: [[1560, 1160], [1660, 1200], [1740, 1300], [1700, 1420]]
    }
  ],
  // Raja Bhoj Airport Infrastructure (North-West)
  airport: {
    id: "raja-bhoj",
    name: "Raja Bhoj Airport (BHO)",
    code: "BHO / VABP",
    runway: {
      start: [200, 100],
      end: [450, 145],
      width: 16,
      heading: "12 / 30"
    },
    apron: [
      [300, 140], [380, 155], [365, 205], [285, 190]
    ],
    terminal: [
      [295, 185], [355, 195], [350, 225], [290, 215]
    ]
  },
  // Parkland & Nature Reserves
  parks: [
    {
      id: "van-vihar",
      name: "Van Vihar National Park (Shoreline Safari)",
      label: "VAN VIHAR NATIONAL PARK",
      points: [
        [280, 690], [420, 730], [560, 710], [670, 620],
        [700, 730], [620, 830], [450, 850], [280, 800]
      ],
      color: "rgba(209, 250, 229, 0.75)",
      stroke: "#86efac"
    },
    {
      id: "kamla-park",
      name: "Kamla Park & Palace Promontory",
      label: "KAMLA PARK",
      points: [
        [690, 480], [740, 470], [750, 540], [700, 550]
      ],
      color: "rgba(209, 250, 229, 0.7)",
      stroke: "#86efac"
    },
    {
      id: "ekant-park",
      name: "Ekant Park & Char Imli Woods",
      label: "EKANT PARK",
      points: [
        [1290, 1020], [1370, 1020], [1360, 1120], [1280, 1110]
      ],
      color: "rgba(209, 250, 229, 0.65)",
      stroke: "#86efac"
    },
    {
      id: "chinar-park",
      name: "Chinar Park Woodlands",
      label: "CHINAR PARK",
      points: [
        [1330, 880], [1375, 880], [1375, 960], [1320, 950]
      ],
      color: "rgba(209, 250, 229, 0.65)",
      stroke: "#86efac"
    },
    {
      id: "shahpura-park",
      name: "Shahpura Lake Promenade",
      label: "SHAHPURA PROMENADE",
      points: [
        [1410, 1130], [1460, 1120], [1480, 1310], [1430, 1310]
      ],
      color: "rgba(209, 250, 229, 0.65)",
      stroke: "#86efac"
    }
  ],
  // Recognizable Bhopal Water Bodies
  waterBodies: [
    {
      id: "upper-lake",
      name: "Upper Lake (Bhojtal / Bada Talab)",
      label: "UPPER LAKE • BHOJTAL",
      points: [
        [120, 230], [240, 190], [380, 210], [520, 240], [640, 310],
        [700, 420], [730, 480], [680, 560], [660, 630], [560, 710],
        [430, 740], [310, 700], [200, 630], [130, 510], [90, 380], [100, 280]
      ],
      island: [
        [360, 440], [420, 430], [440, 470], [380, 480]
      ],
      color: "#dbeafe",
      deepColor: "#93c5fd",
      stroke: "#3b82f6"
    },
    {
      id: "lower-lake",
      name: "Lower Lake (Chhota Talab)",
      label: "LOWER LAKE",
      points: [
        [760, 510], [840, 490], [920, 530], [950, 600],
        [910, 670], [830, 660], [770, 610], [750, 550]
      ],
      color: "#e0f2fe",
      deepColor: "#7dd3fc",
      stroke: "#0284c7"
    },
    {
      id: "shahpura-lake",
      name: "Shahpura Lake (Sector A/B)",
      label: "SHAHPURA LAKE",
      points: [
        [1460, 1140], [1560, 1120], [1630, 1170], [1640, 1260],
        [1570, 1330], [1480, 1310], [1430, 1240]
      ],
      color: "#e0f2fe",
      deepColor: "#7dd3fc",
      stroke: "#0284c7"
    }
  ],
  noFlyZones: [
    {
      id: "nfz-airport",
      name: "Raja Bhoj Airport Airspace",
      code: "NFZ-A01",
      reason: "Civil Aviation Approach Corridor",
      ceiling: "Unlimited",
      points: [
        [160, 40], [480, 50], [540, 190], [460, 270],
        [300, 260], [140, 180]
      ],
      warningLevel: "restricted"
    },
    {
      id: "nfz-secretariat",
      name: "Vallabh Bhavan / Secretariat VIP Enclave",
      code: "NFZ-V02",
      reason: "High Security Government Airspace",
      ceiling: "400m AGL",
      points: [
        [1420, 580], [1660, 590], [1710, 730], [1590, 810],
        [1400, 780], [1370, 670]
      ],
      warningLevel: "no-drone"
    },
    {
      id: "nfz-military",
      name: "Bairagarh Cantonment / Military Base",
      code: "NFZ-M03",
      reason: "Military Restricted Zone",
      ceiling: "500m AGL",
      points: [
        [60, 680], [210, 670], [260, 840], [190, 940],
        [40, 910], [20, 780]
      ],
      warningLevel: "restricted"
    }
  ],
  // Bhopal Distinct District Morphologies & Grouped Building Clusters
  cityBlocks: [
    // 1. TT NAGAR & NEW MARKET (Planned Central City Commercial & Stadium)
    {
      points: [[1050, 760], [1160, 760], [1150, 840], [1040, 840]],
      district: "tt-nagar",
      label: "New Market Commercial",
      buildings: [
        { x: 1056, y: 766, w: 42, h: 30, color: "#ffffff", heightTier: 3 },
        { x: 1104, y: 766, w: 46, h: 28, color: "#f8fafc", heightTier: 2 },
        { x: 1054, y: 802, w: 38, h: 32, color: "#f1f5f9", heightTier: 1 },
        { x: 1098, y: 800, w: 46, h: 34, color: "#ffffff", heightTier: 2 }
      ]
    },
    {
      points: [[1040, 880], [1140, 880], [1140, 970], [1030, 970]],
      district: "tt-nagar",
      label: "TT Nagar Stadium Complex",
      buildings: [
        { x: 1046, y: 888, w: 40, h: 35, color: "#ffffff", heightTier: 2 },
        { x: 1092, y: 888, w: 42, h: 32, color: "#f8fafc", heightTier: 1 },
        { x: 1042, y: 928, w: 42, h: 36, color: "#f1f5f9", heightTier: 2 },
        { x: 1090, y: 926, w: 44, h: 38, color: "#ffffff", heightTier: 3 }
      ]
    },
    {
      points: [[1220, 760], [1330, 750], [1340, 840], [1230, 840]],
      district: "tt-nagar",
      label: "Apex Bank & Commercial",
      buildings: [
        { x: 1228, y: 766, w: 48, h: 32, color: "#ffffff", heightTier: 3 },
        { x: 1282, y: 762, w: 44, h: 34, color: "#f8fafc", heightTier: 2 },
        { x: 1234, y: 804, w: 46, h: 30, color: "#f1f5f9", heightTier: 2 },
        { x: 1286, y: 802, w: 44, h: 32, color: "#ffffff", heightTier: 3 }
      ]
    },
    {
      points: [[1220, 880], [1330, 890], [1320, 980], [1210, 980]],
      district: "tt-nagar",
      label: "South TT Nagar",
      buildings: [
        { x: 1226, y: 888, w: 44, h: 36, color: "#ffffff", heightTier: 2 },
        { x: 1276, y: 894, w: 44, h: 32, color: "#f8fafc", heightTier: 1 },
        { x: 1222, y: 930, w: 42, h: 42, color: "#f1f5f9", heightTier: 2 },
        { x: 1270, y: 932, w: 44, h: 40, color: "#ffffff", heightTier: 2 }
      ]
    },

    // 2. MP NAGAR (High-Density Corporate / Commercial Hub)
    {
      points: [[1380, 860], [1520, 860], [1510, 950], [1380, 950]],
      district: "mp-nagar",
      label: "MP Nagar Zone-I",
      buildings: [
        { x: 1388, y: 868, w: 56, h: 34, color: "#ffffff", heightTier: 4, hasHvac: true },
        { x: 1450, y: 868, w: 60, h: 34, color: "#f8fafc", heightTier: 3, hasHvac: true },
        { x: 1388, y: 908, w: 58, h: 34, color: "#f1f5f9", heightTier: 3 },
        { x: 1452, y: 908, w: 52, h: 34, color: "#ffffff", heightTier: 4, hasHvac: true }
      ]
    },
    {
      points: [[1540, 860], [1680, 860], [1670, 950], [1540, 950]],
      district: "mp-nagar",
      label: "MP Nagar Zone-II",
      buildings: [
        { x: 1548, y: 868, w: 56, h: 34, color: "#ffffff", heightTier: 3 },
        { x: 1610, y: 868, w: 58, h: 34, color: "#f8fafc", heightTier: 4, hasHvac: true },
        { x: 1546, y: 908, w: 54, h: 34, color: "#f1f5f9", heightTier: 2 },
        { x: 1606, y: 908, w: 58, h: 34, color: "#ffffff", heightTier: 3 }
      ]
    },
    {
      points: [[1380, 970], [1520, 970], [1510, 1070], [1370, 1070]],
      district: "mp-nagar",
      label: "DB City Mall & Commercial",
      buildings: [
        { x: 1388, y: 978, w: 64, h: 42, color: "#ffffff", heightTier: 4, isMajor: true },
        { x: 1458, y: 978, w: 52, h: 42, color: "#f8fafc", heightTier: 4, hasHvac: true },
        { x: 1384, y: 1026, w: 58, h: 38, color: "#f1f5f9", heightTier: 3 },
        { x: 1448, y: 1026, w: 56, h: 38, color: "#ffffff", heightTier: 4, hasHvac: true }
      ]
    },
    {
      points: [[1540, 970], [1680, 970], [1670, 1070], [1530, 1070]],
      district: "mp-nagar",
      label: "Pragati Commercial Core",
      buildings: [
        { x: 1548, y: 978, w: 56, h: 38, color: "#ffffff", heightTier: 3 },
        { x: 1610, y: 978, w: 58, h: 38, color: "#f8fafc", heightTier: 3 },
        { x: 1542, y: 1022, w: 58, h: 40, color: "#f1f5f9", heightTier: 2 },
        { x: 1606, y: 1022, w: 58, h: 40, color: "#ffffff", heightTier: 3 }
      ]
    },

    // 3. ARERA COLONY (Spacious Residential Sectors with Greenery)
    {
      points: [[1160, 1020], [1320, 1020], [1310, 1140], [1150, 1130]],
      district: "arera-colony",
      label: "Arera Colony E-1",
      buildings: [
        { x: 1170, y: 1028, w: 60, h: 42, color: "#ffffff", heightTier: 2, isVilla: true },
        { x: 1240, y: 1028, w: 64, h: 42, color: "#f8fafc", heightTier: 2, isVilla: true },
        { x: 1166, y: 1080, w: 62, h: 42, color: "#f1f5f9", heightTier: 1, isVilla: true },
        { x: 1238, y: 1080, w: 64, h: 42, color: "#ffffff", heightTier: 2, isVilla: true }
      ]
    },
    {
      points: [[1340, 1090], [1450, 1090], [1440, 1210], [1330, 1200]],
      district: "arera-colony",
      label: "Bittan Market Hub",
      buildings: [
        { x: 1348, y: 1098, w: 44, h: 46, color: "#ffffff", heightTier: 3 },
        { x: 1398, y: 1098, w: 42, h: 46, color: "#f8fafc", heightTier: 2 },
        { x: 1344, y: 1150, w: 42, h: 46, color: "#f1f5f9", heightTier: 2 },
        { x: 1392, y: 1150, w: 44, h: 46, color: "#ffffff", heightTier: 3 }
      ]
    },
    {
      points: [[1150, 1160], [1300, 1170], [1290, 1290], [1140, 1280]],
      district: "arera-colony",
      label: "Arera Colony E-3",
      buildings: [
        { x: 1160, y: 1172, w: 58, h: 44, color: "#ffffff", heightTier: 2, isVilla: true },
        { x: 1228, y: 1176, w: 60, h: 44, color: "#f8fafc", heightTier: 1, isVilla: true },
        { x: 1152, y: 1228, w: 62, h: 42, color: "#f1f5f9", heightTier: 2, isVilla: true },
        { x: 1224, y: 1230, w: 60, h: 44, color: "#ffffff", heightTier: 2, isVilla: true }
      ]
    },
    {
      points: [[1320, 1230], [1460, 1240], [1450, 1370], [1310, 1360]],
      district: "arera-colony",
      label: "Arera Colony E-5",
      buildings: [
        { x: 1330, y: 1242, w: 54, h: 48, color: "#ffffff", heightTier: 2, isVilla: true },
        { x: 1394, y: 1246, w: 54, h: 48, color: "#f8fafc", heightTier: 1, isVilla: true },
        { x: 1324, y: 1300, w: 56, h: 50, color: "#f1f5f9", heightTier: 2, isVilla: true },
        { x: 1390, y: 1302, w: 52, h: 50, color: "#ffffff", heightTier: 2, isVilla: true }
      ]
    },

    // 4. OLD BHOPAL (Very Dense Heritage Blocks with Narrow Alleys)
    {
      points: [[980, 480], [1120, 480], [1120, 580], [980, 580]],
      district: "old-bhopal",
      label: "Hamidia & Sultania Enclave",
      buildings: [
        { x: 986, y: 486, w: 26, h: 22, color: "#ffffff", heightTier: 2 },
        { x: 1016, y: 486, w: 28, h: 22, color: "#f1f5f9", heightTier: 2 },
        { x: 1048, y: 486, w: 28, h: 22, color: "#e2e8f0", heightTier: 1 },
        { x: 1080, y: 486, w: 32, h: 22, color: "#ffffff", heightTier: 3 },
        { x: 986, y: 512, w: 30, h: 24, color: "#f8fafc", heightTier: 2 },
        { x: 1020, y: 512, w: 26, h: 24, color: "#ffffff", heightTier: 1 },
        { x: 1050, y: 512, w: 30, h: 24, color: "#f1f5f9", heightTier: 2 },
        { x: 1084, y: 512, w: 28, h: 24, color: "#ffffff", heightTier: 2 },
        { x: 986, y: 540, w: 34, h: 32, color: "#f1f5f9", heightTier: 3 },
        { x: 1024, y: 540, w: 28, h: 32, color: "#ffffff", heightTier: 2 },
        { x: 1056, y: 540, w: 28, h: 32, color: "#f8fafc", heightTier: 1 },
        { x: 1088, y: 540, w: 26, h: 32, color: "#ffffff", heightTier: 2 }
      ]
    },
    {
      points: [[1140, 480], [1300, 470], [1300, 580], [1140, 590]],
      district: "old-bhopal",
      label: "Chowk Bazaar & Moti Masjid",
      buildings: [
        { x: 1146, y: 484, w: 32, h: 24, color: "#ffffff", heightTier: 2 },
        { x: 1182, y: 484, w: 34, h: 24, color: "#f8fafc", heightTier: 2 },
        { x: 1220, y: 482, w: 34, h: 24, color: "#f1f5f9", heightTier: 1 },
        { x: 1258, y: 480, w: 34, h: 24, color: "#ffffff", heightTier: 2 },
        { x: 1146, y: 512, w: 34, h: 26, color: "#f1f5f9", heightTier: 1 },
        { x: 1184, y: 512, w: 32, h: 26, color: "#ffffff", heightTier: 3 },
        { x: 1220, y: 510, w: 34, h: 26, color: "#f8fafc", heightTier: 2 },
        { x: 1258, y: 508, w: 34, h: 26, color: "#ffffff", heightTier: 2 },
        { x: 1146, y: 542, w: 32, h: 38, color: "#ffffff", heightTier: 2 },
        { x: 1182, y: 542, w: 34, h: 38, color: "#f1f5f9", heightTier: 2 },
        { x: 1220, y: 540, w: 34, h: 38, color: "#f8fafc", heightTier: 1 },
        { x: 1258, y: 538, w: 34, h: 38, color: "#ffffff", heightTier: 2 }
      ]
    },

    // 5. SHYAMLA HILLS (Scenic Hillside Overlooking Lake)
    {
      points: [[720, 360], [860, 350], [870, 460], [730, 470]],
      district: "shyamla-hills",
      label: "Shyamla Hills Res.",
      buildings: [
        { x: 732, y: 366, w: 56, h: 40, color: "#ffffff", heightTier: 2, isVilla: true },
        { x: 796, y: 362, w: 60, h: 40, color: "#f8fafc", heightTier: 2, isVilla: true },
        { x: 738, y: 414, w: 58, h: 44, color: "#f1f5f9", heightTier: 1, isVilla: true },
        { x: 802, y: 410, w: 58, h: 42, color: "#ffffff", heightTier: 2, isVilla: true }
      ]
    },
    {
      points: [[890, 350], [1020, 340], [1030, 450], [900, 460]],
      district: "shyamla-hills",
      label: "Manav Sangrahalaya Zone",
      buildings: [
        { x: 902, y: 354, w: 52, h: 42, color: "#ffffff", heightTier: 2 },
        { x: 960, y: 350, w: 54, h: 42, color: "#f8fafc", heightTier: 2 },
        { x: 908, y: 404, w: 52, h: 44, color: "#f1f5f9", heightTier: 1 },
        { x: 966, y: 400, w: 56, h: 44, color: "#ffffff", heightTier: 2 }
      ]
    },
    {
      points: [[720, 680], [860, 690], [850, 780], [710, 770]],
      district: "shyamla-hills",
      label: "Polytechnic Square Area",
      buildings: [
        { x: 728, y: 692, w: 56, h: 36, color: "#ffffff", heightTier: 2 },
        { x: 792, y: 696, w: 54, h: 36, color: "#f8fafc", heightTier: 2 },
        { x: 722, y: 734, w: 56, h: 38, color: "#f1f5f9", heightTier: 1 },
        { x: 786, y: 736, w: 54, h: 36, color: "#ffffff", heightTier: 2 }
      ]
    },

    // 6. SHAHPURA (Lakeside Curving Residential)
    {
      points: [[1480, 1380], [1620, 1370], [1610, 1490], [1470, 1490]],
      district: "shahpura",
      label: "Gulmohar Colony",
      buildings: [
        { x: 1488, y: 1386, w: 58, h: 44, color: "#ffffff", heightTier: 2 },
        { x: 1552, y: 1382, w: 58, h: 44, color: "#f8fafc", heightTier: 2 },
        { x: 1482, y: 1436, w: 56, h: 44, color: "#f1f5f9", heightTier: 1 },
        { x: 1546, y: 1434, w: 56, h: 44, color: "#ffffff", heightTier: 2 }
      ]
    },
    {
      points: [[1650, 1130], [1780, 1140], [1770, 1260], [1640, 1250]],
      district: "shahpura",
      label: "Shahpura Sector A",
      buildings: [
        { x: 1658, y: 1142, w: 54, h: 46, color: "#ffffff", heightTier: 2 },
        { x: 1718, y: 1146, w: 50, h: 46, color: "#f8fafc", heightTier: 2 },
        { x: 1652, y: 1196, w: 52, h: 46, color: "#f1f5f9", heightTier: 1 },
        { x: 1712, y: 1200, w: 50, h: 48, color: "#ffffff", heightTier: 2 }
      ]
    },

    // 7. HABIBGANJ / RANI KAMLAPATI STATION
    {
      points: [[1700, 870], [1860, 870], [1850, 1000], [1690, 990]],
      district: "habibganj",
      label: "Rani Kamlapati Station Enclave",
      buildings: [
        { x: 1712, y: 880, w: 66, h: 48, color: "#ffffff", heightTier: 4, hasHvac: true },
        { x: 1784, y: 880, w: 64, h: 48, color: "#f8fafc", heightTier: 3 },
        { x: 1706, y: 936, w: 66, h: 48, color: "#f1f5f9", heightTier: 3 },
        { x: 1778, y: 936, w: 66, h: 48, color: "#ffffff", heightTier: 4 }
      ]
    },

    // 8. GOVINDPURA (Heavy Industrial Sheds & BHEL Ancillary)
    {
      points: [[1760, 630], [1940, 620], [1950, 760], [1770, 770]],
      district: "govindpura",
      label: "Govindpura Industrial Estate",
      buildings: [
        { x: 1774, y: 640, w: 76, h: 48, color: "#f8fafc", heightTier: 2, isIndustrial: true },
        { x: 1858, y: 636, w: 74, h: 50, color: "#ffffff", heightTier: 2, isIndustrial: true },
        { x: 1778, y: 698, w: 76, h: 54, color: "#f1f5f9", heightTier: 2, isIndustrial: true },
        { x: 1862, y: 694, w: 76, h: 54, color: "#ffffff", heightTier: 2, isIndustrial: true }
      ]
    },

    // 9. KOLAR ROAD (Southward Ribbon Corridor)
    {
      points: [[980, 1260], [1110, 1270], [1100, 1420], [970, 1410]],
      district: "kolar-road",
      label: "Kolar Sarvadharma Corridor",
      buildings: [
        { x: 990, y: 1272, w: 54, h: 62, color: "#ffffff", heightTier: 2 },
        { x: 1048, y: 1276, w: 52, h: 62, color: "#f8fafc", heightTier: 1 },
        { x: 984, y: 1342, w: 54, h: 62, color: "#f1f5f9", heightTier: 2 },
        { x: 1044, y: 1346, w: 50, h: 62, color: "#ffffff", heightTier: 2 }
      ]
    }
  ],
  // Stylized Bhopal District Labels
  districtLabels: [
    { x: 410, y: 360, text: "UPPER LAKE • BHOJTAL", tag: "LANDMARK" },
    { x: 450, y: 810, text: "VAN VIHAR NATIONAL PARK", tag: "RESERVE" },
    { x: 310, y: 85, text: "RAJA BHOJ AIRPORT", tag: "AVIATION" },
    { x: 840, y: 420, text: "SHYAMLA HILLS", tag: "RIDGE" },
    { x: 1140, y: 450, text: "OLD BHOPAL (HERITAGE CORE)", tag: "DISTRICT" },
    { x: 860, y: 570, text: "LOWER LAKE", tag: "WATER" },
    { x: 1090, y: 730, text: "NEW MARKET", tag: "COMMERCIAL" },
    { x: 1180, y: 830, text: "TT NAGAR CENTRAL", tag: "HUB" },
    { x: 1530, y: 840, text: "MP NAGAR (ZONE I & II)", tag: "BUSINESS" },
    { x: 1220, y: 1110, text: "ARERA COLONY", tag: "RESIDENTIAL" },
    { x: 1390, y: 1070, text: "BITTAN MARKET", tag: "MARKET" },
    { x: 1710, y: 1110, text: "SHAHPURA", tag: "LAKESIDE" },
    { x: 1850, y: 600, text: "GOVINDPURA INDUSTRIAL", tag: "INDUSTRIAL" },
    { x: 1040, y: 1240, text: "KOLAR ROAD CORRIDOR", tag: "CORRIDOR" }
  ],
  // Hierarchical road network aligned with Bhopal geography
  roads: {
    primary: [
      // VIP Road sweeping along northern & eastern shore of Upper Lake
      [[140, 310], [280, 230], [420, 260], [580, 310], [700, 420], [860, 480], [980, 680], [1180, 860]],
      // Link Road 1 (Depot / TT Nagar to MP Nagar)
      [[1180, 860], [1360, 860], [1530, 860], [1690, 870], [1860, 870]],
      // Hoshangabad Highway (MP Nagar -> Rani Kamlapati -> Misrod / South-East)
      [[1690, 870], [1690, 1010], [1680, 1150], [1670, 1320], [1680, 1550]],
      // Link Road 2 / Kolar Road Corridor (Depot -> Arera Colony -> Kolar south)
      [[1180, 860], [1160, 1010], [1140, 1160], [1110, 1320], [1080, 1540]],
      // Hamidia Corridor into Old City / Ayodhya Bypass north
      [[1180, 860], [1150, 690], [1140, 580], [1140, 440], [1160, 260], [1200, 90]],
      // Bhadbhada Road (TT Nagar south-west toward Van Vihar / Bhadbhada Dam)
      [[1180, 860], [1000, 860], [860, 810], [700, 750], [560, 740]]
    ],
    secondary: [
      // Link Road 3 connecting TT Nagar to Arera Colony and Bittan Market
      [[1040, 860], [1040, 1020], [1150, 1020], [1330, 1020], [1480, 1030]],
      // MP Nagar to Bittan Market
      [[1530, 860], [1530, 1020], [1450, 1090], [1440, 1220]],
      // Bittan Market to Shahpura Lake
      [[1440, 1220], [1500, 1230], [1640, 1250], [1780, 1260]],
      // Old City through to Govindpura
      [[1300, 580], [1460, 590], [1760, 630], [1950, 630]],
      // Shyamla Hills scenic circuit
      [[860, 480], [860, 680], [980, 680], [980, 480]],
      // Kolar cross-link to Gulmohar / Shahpura
      [[1110, 1320], [1280, 1330], [1460, 1340], [1630, 1340]],
      // Airport access link from VIP Road
      [[280, 230], [310, 190], [330, 150]]
    ],
    tertiary: [
      // Local street grid links
      [[1040, 760], [1180, 760], [1340, 750]],
      [[1040, 970], [1180, 970], [1330, 980]],
      [[1380, 950], [1530, 950], [1680, 950]],
      [[1380, 1070], [1530, 1070], [1680, 1070]],
      [[1150, 1130], [1310, 1140]],
      [[1140, 1280], [1290, 1290]],
      [[1310, 1360], [1460, 1370]],
      [[1700, 990], [1850, 1000]],
      [[1760, 760], [1950, 760]],
      [[980, 530], [1140, 530]]
    ],
    // Visual-only local connector lanes (does NOT affect route graph)
    localStreets: [
      [[1040, 800], [1160, 800]],
      [[1040, 920], [1140, 920]],
      [[1220, 800], [1340, 800]],
      [[1220, 930], [1320, 930]],
      [[1380, 900], [1520, 900]],
      [[1540, 900], [1680, 900]],
      [[1380, 1020], [1520, 1020]],
      [[1540, 1020], [1680, 1020]],
      [[1160, 1080], [1310, 1080]],
      [[1150, 1220], [1290, 1220]],
      [[1320, 1300], [1450, 1300]],
      [[730, 410], [860, 410]],
      [[890, 400], [1020, 400]],
      [[1710, 930], [1850, 930]],
      [[1770, 700], [1940, 700]],
      [[980, 510], [1120, 510]],
      [[980, 550], [1120, 550]],
      [[1140, 510], [1300, 510]],
      [[1140, 550], [1300, 550]]
    ]
  }
};
