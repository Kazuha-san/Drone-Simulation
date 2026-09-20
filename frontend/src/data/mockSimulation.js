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

export const DRONE_SPECS = {
  model: "AeroVanguard V4 Cargo Hexacopter",
  maxPayloadKg: 4.5,
  cruiseSpeedKmh: 65.0,
  batteryCapacityKwh: 1.4,
  avgEnergyPerKmKwh: 0.076,
  maxFlightAltitudeM: 120,
  sensorPayload: "LiDAR Obstacle Avoidance + Dual RTK-GPS"
};

export const GROUND_SPECS = {
  model: "AeroExpress EV Cargo Courier",
  maxPayloadKg: 45.0,
  avgSpeedKmh: 24.5,
  batteryCapacityKwh: 4.8,
  avgEnergyPerKmKwh: 0.182,
  trafficSensitivity: "High (Peak urban congestion index 1.84)"
};

export const SCENARIOS = {
  baseline: {
    id: "baseline",
    name: "Baseline",
    tagline: "Standard Urban Delivery Dispatch",
    description: "Nominal operational conditions across Bhopal metropolitan core with normal traffic and clear skyway corridors.",
    weather: { windKmh: 8, visibilityKm: 10, condition: "Clear Sky", tempC: 28 },
    trafficMultiplier: 1.0,
    droneSpeedFactor: 1.0,
    groundSpeedFactor: 1.0,
    orders: [
      {
        id: "ORD-101",
        title: "Cold-Chain Cardiac Specimen",
        category: "Medical Priority",
        location: "Hamidia Hospital Complex",
        x: 1060,
        y: 520,
        priority: "critical",
        status: "completed",
        assignedVehicle: "drone",
        weightKg: 1.2,
        distanceKm: 3.8,
        etaMinutes: 4.2,
        energyKwh: 0.28,
        timeWindow: "00:00 - 00:15",
        completedAtSeconds: 420
      },
      {
        id: "ORD-102",
        title: "Express Commercial Contract Docs",
        category: "Corporate",
        location: "MP Nagar Zone-I, Plot 42",
        x: 1450,
        y: 910,
        priority: "high",
        status: "completed",
        assignedVehicle: "drone",
        weightKg: 0.8,
        distanceKm: 2.9,
        etaMinutes: 3.1,
        energyKwh: 0.21,
        timeWindow: "00:05 - 00:20",
        completedAtSeconds: 780
      },
      {
        id: "ORD-103",
        title: "Emergency Antidote Vial",
        category: "Medical Priority",
        location: "Arera Colony Sector E-3",
        x: 1220,
        y: 1230,
        priority: "critical",
        status: "completed",
        assignedVehicle: "drone",
        weightKg: 0.6,
        distanceKm: 3.7,
        etaMinutes: 4.0,
        energyKwh: 0.27,
        timeWindow: "00:10 - 00:25",
        completedAtSeconds: 1140
      },
      {
        id: "ORD-104",
        title: "Laboratory Diagnostic Reagents",
        category: "Healthcare",
        location: "Bittan Market Medical Centre",
        x: 1390,
        y: 1150,
        priority: "high",
        status: "completed",
        assignedVehicle: "drone",
        weightKg: 1.4,
        distanceKm: 3.6,
        etaMinutes: 3.9,
        energyKwh: 0.29,
        timeWindow: "00:15 - 00:30",
        completedAtSeconds: 1520
      },
      {
        id: "ORD-105",
        title: "Emergency Network SFP Optics",
        category: "IT Infrastructure",
        location: "DB Mall IT Hub, MP Nagar",
        x: 1450,
        y: 1020,
        priority: "high",
        status: "assigned",
        assignedVehicle: "drone",
        weightKg: 1.1,
        distanceKm: 3.2,
        etaMinutes: 3.5,
        energyKwh: 0.24,
        timeWindow: "00:20 - 00:35",
        completedAtSeconds: 2100
      },
      {
        id: "ORD-106",
        title: "Bulk Retail Apparel Pack",
        category: "Retail Logistics",
        location: "New Market Trade Tower",
        x: 1100,
        y: 800,
        priority: "standard",
        status: "completed",
        assignedVehicle: "ground",
        weightKg: 8.5,
        distanceKm: 1.8,
        etaMinutes: 12.4,
        energyKwh: 0.54,
        timeWindow: "00:00 - 00:30",
        completedAtSeconds: 840
      },
      {
        id: "ORD-107",
        title: "Heavy Office Hardware Supplies",
        category: "Office Cargo",
        location: "Apex Commercial Arcade",
        x: 1280,
        y: 800,
        priority: "standard",
        status: "completed",
        assignedVehicle: "ground",
        weightKg: 14.2,
        distanceKm: 2.1,
        etaMinutes: 14.1,
        energyKwh: 0.62,
        timeWindow: "00:10 - 00:40",
        completedAtSeconds: 1480
      },
      {
        id: "ORD-108",
        title: "Automotive Precision Sensors",
        category: "Industrial Spares",
        location: "Govindpura Industrial Gate 3",
        x: 1850,
        y: 690,
        priority: "high",
        status: "assigned",
        assignedVehicle: "ground",
        weightKg: 7.2,
        distanceKm: 8.6,
        etaMinutes: 28.5,
        energyKwh: 1.58,
        timeWindow: "00:15 - 00:55",
        completedAtSeconds: 2450
      },
      {
        id: "ORD-109",
        title: "Insulin Cold Pen Dispensary",
        category: "Medical Priority",
        location: "Shahpura Sector A, Hub",
        x: 1710,
        y: 1190,
        priority: "critical",
        status: "pending",
        assignedVehicle: "drone",
        weightKg: 0.5,
        distanceKm: 6.2,
        etaMinutes: 6.8,
        energyKwh: 0.46,
        timeWindow: "00:30 - 00:50",
        completedAtSeconds: 2700
      },
      {
        id: "ORD-110",
        title: "E-Commerce Gadget Delivery",
        category: "Consumer Tech",
        location: "Gulmohar Colony Block C",
        x: 1540,
        y: 1430,
        priority: "standard",
        status: "pending",
        assignedVehicle: "ground",
        weightKg: 3.5,
        distanceKm: 6.8,
        etaMinutes: 24.2,
        energyKwh: 1.25,
        timeWindow: "00:35 - 01:10",
        completedAtSeconds: 3100
      },
      {
        id: "ORD-111",
        title: "Critical Transfusion Plasma",
        category: "Medical Priority",
        location: "Rani Kamlapati Emergency Ward",
        x: 1780,
        y: 930,
        priority: "critical",
        status: "pending",
        assignedVehicle: "drone",
        weightKg: 1.8,
        distanceKm: 6.1,
        etaMinutes: 6.5,
        energyKwh: 0.45,
        timeWindow: "00:40 - 01:00",
        completedAtSeconds: 3350
      },
      {
        id: "ORD-112",
        title: "Catering Supplies Crate (38kg)",
        category: "Heavy Logistics",
        location: "VIP Club, Shyamla Hills",
        x: 790,
        y: 410,
        priority: "standard",
        status: "infeasible",
        assignedVehicle: "none",
        infeasibleReason: "Payload (38kg) exceeds 4.5kg drone limit; road reroute required",
        weightKg: 38.0,
        distanceKm: 5.4,
        etaMinutes: null,
        energyKwh: null,
        timeWindow: "00:20 - 01:00"
      },
      {
        id: "ORD-113",
        title: "Restricted Zone Parcel - Secretariat",
        category: "Government Parcel",
        location: "Vallabh Bhavan Annex",
        x: 1550,
        y: 700,
        priority: "standard",
        status: "infeasible",
        assignedVehicle: "none",
        infeasibleReason: "Located inside NFZ-V02 restricted airspace corridor",
        weightKg: 2.1,
        distanceKm: 4.1,
        etaMinutes: null,
        energyKwh: null,
        timeWindow: "00:15 - 00:45"
      },
      {
        id: "ORD-114",
        title: "Solar Inverter Electronics Module",
        category: "Electronics",
        location: "Kolar Mandakini Colony",
        x: 1190,
        y: 1400,
        priority: "standard",
        status: "pending",
        assignedVehicle: "drone",
        weightKg: 2.3,
        distanceKm: 5.4,
        etaMinutes: 5.8,
        energyKwh: 0.39,
        timeWindow: "00:45 - 01:15",
        completedAtSeconds: 3500
      },
      {
        id: "ORD-115",
        title: "Kolar Sarvadharma General Goods",
        category: "Consumer Goods",
        location: "Kolar Sarvadharma Sector 2",
        x: 1040,
        y: 1340,
        priority: "standard",
        status: "pending",
        assignedVehicle: "ground",
        weightKg: 11.0,
        distanceKm: 5.8,
        etaMinutes: 26.0,
        energyKwh: 1.15,
        timeWindow: "00:50 - 01:25",
        completedAtSeconds: 3580
      },
      {
        id: "ORD-116",
        title: "Surgical Sutures & Dressing Kit",
        category: "Medical Priority",
        location: "Old City Dispensary, Chowk",
        x: 1220,
        y: 530,
        priority: "high",
        status: "completed",
        assignedVehicle: "drone",
        weightKg: 1.0,
        distanceKm: 3.4,
        etaMinutes: 3.8,
        energyKwh: 0.25,
        timeWindow: "00:02 - 00:20",
        completedAtSeconds: 610
      },
      {
        id: "ORD-117",
        title: "BHEL Substation Telemetry Chip",
        category: "Industrial Tech",
        location: "BHEL Ancillary Complex",
        x: 2050,
        y: 700,
        priority: "high",
        status: "pending",
        assignedVehicle: "drone",
        weightKg: 1.5,
        distanceKm: 8.9,
        etaMinutes: 9.2,
        energyKwh: 0.65,
        timeWindow: "00:50 - 01:15",
        completedAtSeconds: 3600
      },
      {
        id: "ORD-118",
        title: "Security Radio Communication Pack",
        category: "Telecom",
        location: "Polytechnic Square Station",
        x: 780,
        y: 730,
        priority: "standard",
        status: "completed",
        assignedVehicle: "ground",
        weightKg: 4.8,
        distanceKm: 4.3,
        etaMinutes: 18.2,
        energyKwh: 0.88,
        timeWindow: "00:08 - 00:35",
        completedAtSeconds: 1180
      },
      {
        id: "ORD-119",
        title: "Aviation Maintenance Grease (Airport)",
        category: "Airport Logistics",
        location: "Airport Apron Approach",
        x: 350,
        y: 160,
        priority: "standard",
        status: "infeasible",
        assignedVehicle: "none",
        infeasibleReason: "Located inside NFZ-A01 Airport Civil Aviation No-Drone Zone",
        weightKg: 3.0,
        distanceKm: 11.2,
        etaMinutes: null,
        energyKwh: null,
        timeWindow: "00:30 - 01:10"
      },
      {
        id: "ORD-120",
        title: "Manav Sangrahalaya Research Archive",
        category: "Cultural/Govt",
        location: "Shyamla Hills Cultural Park",
        x: 960,
        y: 400,
        priority: "standard",
        status: "pending",
        assignedVehicle: "ground",
        weightKg: 16.5,
        distanceKm: 5.6,
        etaMinutes: 22.0,
        energyKwh: 1.10,
        timeWindow: "00:40 - 01:20",
        completedAtSeconds: 3450
      },
      {
        id: "ORD-121",
        title: "Urgent Insulin Injection Pack",
        category: "Medical Priority",
        location: "Arera Colony Sector E-5",
        x: 1390,
        y: 1300,
        priority: "critical",
        status: "completed",
        assignedVehicle: "drone",
        weightKg: 0.7,
        distanceKm: 4.8,
        etaMinutes: 5.1,
        energyKwh: 0.35,
        timeWindow: "00:12 - 00:28",
        completedAtSeconds: 980
      },
      {
        id: "ORD-122",
        title: "Stationery & Accounting Books",
        category: "Office Supplies",
        location: "South TT Nagar Commercial",
        x: 1270,
        y: 930,
        priority: "standard",
        status: "completed",
        assignedVehicle: "ground",
        weightKg: 12.0,
        distanceKm: 1.5,
        etaMinutes: 9.5,
        energyKwh: 0.38,
        timeWindow: "00:05 - 00:25",
        completedAtSeconds: 650
      }
    ],
    // High-fidelity route waypoints for drone [x, y, timestamp_seconds, altitude_meters]
    // Starts cleanly at TT Nagar Depot (1180, 860) at t: 0
    droneTrajectory: [
      { x: 1180, y: 860, t: 0, alt: 0 },
      { x: 1180, y: 860, t: 60, alt: 75 }, // takeoff
      { x: 1120, y: 690, t: 240, alt: 90 },
      { x: 1060, y: 520, t: 420, alt: 15 }, // drop ORD-101
      { x: 1140, y: 530, t: 510, alt: 85 },
      { x: 1220, y: 530, t: 610, alt: 15 }, // drop ORD-116
      { x: 1330, y: 720, t: 710, alt: 90 },
      { x: 1450, y: 910, t: 780, alt: 15 }, // drop ORD-102
      { x: 1420, y: 1100, t: 890, alt: 95 },
      { x: 1390, y: 1300, t: 980, alt: 15 }, // drop ORD-121
      { x: 1300, y: 1260, t: 1060, alt: 90 },
      { x: 1220, y: 1230, t: 1140, alt: 15 }, // drop ORD-103
      { x: 1200, y: 1050, t: 1280, alt: 90 },
      { x: 1180, y: 860, t: 1380, alt: 0 }, // reload at depot
      { x: 1180, y: 860, t: 1440, alt: 75 }, // second sortie
      { x: 1280, y: 1000, t: 1480, alt: 90 },
      { x: 1390, y: 1150, t: 1520, alt: 15 }, // drop ORD-104
      { x: 1420, y: 1080, t: 1800, alt: 90 },
      { x: 1450, y: 1020, t: 2100, alt: 15 }, // drop ORD-105
      // skirt no-fly zone NFZ-V02 smoothly
      { x: 1390, y: 840, t: 2300, alt: 95 },
      { x: 1370, y: 640, t: 2450, alt: 95 }, // skirting corner
      { x: 1550, y: 540, t: 2580, alt: 95 }, // safely above NFZ-V02
      { x: 1710, y: 1190, t: 2700, alt: 15 }, // drop ORD-109
      { x: 1780, y: 930, t: 3350, alt: 15 }, // drop ORD-111
      { x: 1190, y: 1400, t: 3500, alt: 15 }, // drop ORD-114
      { x: 2050, y: 700, t: 3600, alt: 15 } // drop ORD-117
    ],
    // Ground courier street polyline trajectory [x, y, timestamp_seconds]
    // Starts cleanly at TT Nagar Depot (1180, 860) at t: 0
    groundTrajectory: [
      { x: 1180, y: 860, t: 0 },
      { x: 1160, y: 760, t: 400 },
      { x: 1270, y: 930, t: 650 }, // drop ORD-122
      { x: 1100, y: 800, t: 840 }, // drop ORD-106
      { x: 860, y: 680, t: 1020 },
      { x: 780, y: 730, t: 1180 }, // drop ORD-118
      { x: 1040, y: 860, t: 1320 },
      { x: 1280, y: 800, t: 1480 }, // drop ORD-107
      { x: 1360, y: 860, t: 1750 },
      { x: 1530, y: 860, t: 1980 },
      { x: 1690, y: 870, t: 2200 },
      { x: 1850, y: 690, t: 2450 }, // drop ORD-108
      { x: 1680, y: 1150, t: 2800 },
      { x: 1540, y: 1430, t: 3100 }, // drop ORD-110
      { x: 960, y: 400, t: 3450 }, // drop ORD-120
      { x: 1040, y: 1340, t: 3580 } // drop ORD-115
    ],
    metrics: {
      totalOrders: 22,
      droneDeliveries: 12,
      groundDeliveries: 7,
      infeasibleOrders: 3,
      avgDeliveryTimeMinutes: 14.2,
      droneAvgDeliveryTimeMinutes: 4.8,
      groundAvgDeliveryTimeMinutes: 18.6,
      droneAvgDistanceKm: 4.3,
      groundAvgDistanceKm: 5.7,
      droneEnergyKwh: 2.84,
      groundEnergyKwh: 6.92,
      optimalityGapPct: 0.0,
      totalEnergyUsedKwh: 9.76,
      feasibilityRatePct: 86.4
    }
  },
  peak: {
    id: "peak",
    name: "Peak Demand",
    tagline: "Commercial High-Density Rush Hour",
    description: "Intense order clustering around commercial centers (MP Nagar, New Market). Ground vehicles encounter severe congestion delays, magnifying drone aerial efficiency.",
    weather: { windKmh: 14, visibilityKm: 8, condition: "Partly Cloudy", tempC: 32 },
    trafficMultiplier: 2.2,
    droneSpeedFactor: 0.95,
    groundSpeedFactor: 0.45,
    orders: [
      {
        id: "ORD-201",
        title: "Stat Cardiac Tissue Specimen",
        category: "Medical Priority",
        location: "Hamidia Hospital Complex",
        x: 1060,
        y: 520,
        priority: "critical",
        status: "completed",
        assignedVehicle: "drone",
        weightKg: 1.4,
        distanceKm: 3.8,
        etaMinutes: 4.4,
        energyKwh: 0.31,
        timeWindow: "00:00 - 00:15",
        completedAtSeconds: 380
      },
      {
        id: "ORD-202",
        title: "Emergency Banking Settlement Token",
        category: "High-Value Financial",
        location: "MP Nagar Zone-I, Axis Bank",
        x: 1450,
        y: 910,
        priority: "critical",
        status: "completed",
        assignedVehicle: "drone",
        weightKg: 0.4,
        distanceKm: 2.9,
        etaMinutes: 3.2,
        energyKwh: 0.22,
        timeWindow: "00:05 - 00:20",
        completedAtSeconds: 710
      },
      {
        id: "ORD-203",
        title: "Cold Chain Insulin Vials",
        category: "Medical Priority",
        location: "Arera Colony Sector E-3",
        x: 1220,
        y: 1230,
        priority: "critical",
        status: "completed",
        assignedVehicle: "drone",
        weightKg: 0.9,
        distanceKm: 3.7,
        etaMinutes: 4.1,
        energyKwh: 0.28,
        timeWindow: "00:10 - 00:25",
        completedAtSeconds: 1080
      },
      {
        id: "ORD-204",
        title: "Critical Telemetry Router Part",
        category: "IT Infrastructure",
        location: "DB Mall Enterprise Zone",
        x: 1450,
        y: 1020,
        priority: "high",
        status: "assigned",
        assignedVehicle: "drone",
        weightKg: 1.8,
        distanceKm: 3.2,
        etaMinutes: 3.7,
        energyKwh: 0.26,
        timeWindow: "00:15 - 00:30",
        completedAtSeconds: 1950
      },
      {
        id: "ORD-205",
        title: "Bulk Retail Cartons (Stuck in Traffic)",
        category: "Heavy Retail",
        location: "New Market Plaza",
        x: 1100,
        y: 800,
        priority: "standard",
        status: "assigned",
        assignedVehicle: "ground",
        weightKg: 22.0,
        distanceKm: 1.8,
        etaMinutes: 28.5,
        energyKwh: 0.95,
        timeWindow: "00:05 - 00:45",
        completedAtSeconds: 2200
      },
      {
        id: "ORD-206",
        title: "Heavy Server Rack Batteries (52kg)",
        category: "Heavy Industrial",
        location: "Govindpura Unit 4",
        x: 1850,
        y: 690,
        priority: "standard",
        status: "infeasible",
        assignedVehicle: "none",
        infeasibleReason: "Payload (52kg) severely exceeds drone limit; extreme ground congestion",
        weightKg: 52.0,
        distanceKm: 8.6,
        etaMinutes: null,
        energyKwh: null,
        timeWindow: "00:10 - 01:00"
      },
      {
        id: "ORD-207",
        title: "Secretariat Protocol Delivery",
        category: "Government",
        location: "Vallabh Bhavan Annex",
        x: 1550,
        y: 700,
        priority: "standard",
        status: "infeasible",
        assignedVehicle: "none",
        infeasibleReason: "Active NFZ-V02 temporary VIP security perimeter",
        weightKg: 1.8,
        distanceKm: 4.1,
        etaMinutes: null,
        energyKwh: null,
        timeWindow: "00:15 - 00:45"
      },
      {
        id: "ORD-208",
        title: "Rapid Antibiotic Infusion Kit",
        category: "Medical Priority",
        location: "Bittan Market Clinic",
        x: 1390,
        y: 1150,
        priority: "high",
        status: "completed",
        assignedVehicle: "drone",
        weightKg: 1.2,
        distanceKm: 3.6,
        etaMinutes: 3.9,
        energyKwh: 0.30,
        timeWindow: "00:20 - 00:40",
        completedAtSeconds: 1450
      },
      {
        id: "ORD-209",
        title: "Shahpura Doctor Urgent Supplies",
        category: "Healthcare",
        location: "Shahpura Heights",
        x: 1710,
        y: 1190,
        priority: "high",
        status: "pending",
        assignedVehicle: "drone",
        weightKg: 0.9,
        distanceKm: 6.2,
        etaMinutes: 6.9,
        energyKwh: 0.48,
        timeWindow: "00:30 - 01:00",
        completedAtSeconds: 2750
      },
      {
        id: "ORD-210",
        title: "Airport Radar Calibration Tool",
        category: "Aviation Maintenance",
        location: "Airport Runway North",
        x: 350,
        y: 160,
        priority: "standard",
        status: "infeasible",
        assignedVehicle: "none",
        infeasibleReason: "Located inside NFZ-A01 Airport Active Airspace",
        weightKg: 2.5,
        distanceKm: 11.2,
        etaMinutes: null,
        energyKwh: null,
        timeWindow: "00:30 - 01:10"
      }
    ],
    droneTrajectory: [
      { x: 1180, y: 860, t: 0, alt: 0 },
      { x: 1180, y: 860, t: 50, alt: 80 },
      { x: 1120, y: 690, t: 210, alt: 95 },
      { x: 1060, y: 520, t: 380, alt: 15 }, // ORD-201
      { x: 1250, y: 720, t: 550, alt: 90 },
      { x: 1450, y: 910, t: 710, alt: 15 }, // ORD-202
      { x: 1340, y: 1070, t: 900, alt: 95 },
      { x: 1220, y: 1230, t: 1080, alt: 15 }, // ORD-203
      { x: 1300, y: 1190, t: 1260, alt: 90 },
      { x: 1390, y: 1150, t: 1450, alt: 15 }, // ORD-208
      { x: 1280, y: 1000, t: 1680, alt: 90 },
      { x: 1180, y: 860, t: 1800, alt: 0 }, // reload
      { x: 1310, y: 940, t: 1880, alt: 80 },
      { x: 1450, y: 1020, t: 1950, alt: 15 }, // ORD-204
      { x: 1580, y: 1100, t: 2350, alt: 95 },
      { x: 1710, y: 1190, t: 2750, alt: 15 }, // ORD-209
      { x: 1180, y: 860, t: 3600, alt: 0 }
    ],
    groundTrajectory: [
      { x: 1180, y: 860, t: 0 },
      { x: 1160, y: 760, t: 900 }, // heavy delay
      { x: 1100, y: 800, t: 2200 }, // drop ORD-205
      { x: 1280, y: 800, t: 3600 }
    ],
    metrics: {
      totalOrders: 28,
      droneDeliveries: 18,
      groundDeliveries: 6,
      infeasibleOrders: 4,
      avgDeliveryTimeMinutes: 19.8,
      droneAvgDeliveryTimeMinutes: 4.6,
      groundAvgDeliveryTimeMinutes: 34.2,
      droneAvgDistanceKm: 4.1,
      groundAvgDistanceKm: 6.2,
      droneEnergyKwh: 3.42,
      groundEnergyKwh: 12.40,
      optimalityGapPct: 1.4,
      totalEnergyUsedKwh: 15.82,
      feasibilityRatePct: 85.7
    }
  },
  stress: {
    id: "stress",
    name: "Stress Test",
    tagline: "Dynamic Airspace Reroute & Adverse Weather",
    description: "Evaluates multi-obstacle avoidance along the Upper Lake VIP axis with gusty crosswinds and dynamic geofence containment.",
    weather: { windKmh: 34, visibilityKm: 4.5, condition: "Squall Advisory", tempC: 22 },
    trafficMultiplier: 1.6,
    droneSpeedFactor: 0.82,
    groundSpeedFactor: 0.70,
    orders: [
      {
        id: "ORD-301",
        title: "Urgent Ventilator Valve Pack",
        category: "Medical Priority",
        location: "Hamidia Hospital Complex",
        x: 1060,
        y: 520,
        priority: "critical",
        status: "completed",
        assignedVehicle: "drone",
        weightKg: 1.5,
        distanceKm: 4.2,
        etaMinutes: 5.4,
        energyKwh: 0.38,
        timeWindow: "00:00 - 00:20",
        completedAtSeconds: 460
      },
      {
        id: "ORD-302",
        title: "Backup Server SSD Array",
        category: "Critical Tech",
        location: "MP Nagar Zone-I",
        x: 1450,
        y: 910,
        priority: "high",
        status: "completed",
        assignedVehicle: "drone",
        weightKg: 1.1,
        distanceKm: 3.4,
        etaMinutes: 4.2,
        energyKwh: 0.29,
        timeWindow: "00:05 - 00:25",
        completedAtSeconds: 840
      },
      {
        id: "ORD-303",
        title: "Evasive Reroute Medicine",
        category: "Medical Priority",
        location: "Bittan Market Clinic",
        x: 1390,
        y: 1150,
        priority: "critical",
        status: "assigned",
        assignedVehicle: "drone",
        weightKg: 0.8,
        distanceKm: 4.8,
        etaMinutes: 5.8,
        energyKwh: 0.41,
        timeWindow: "00:15 - 00:40",
        completedAtSeconds: 1980
      },
      {
        id: "ORD-304",
        title: "Military Cantonment Boundary Drop",
        category: "Restricted Entry",
        location: "Bairagarh Post",
        x: 140,
        y: 820,
        priority: "standard",
        status: "infeasible",
        assignedVehicle: "none",
        infeasibleReason: "Intercepts Military No-Fly Zone NFZ-M03 with wind shear exceedance",
        weightKg: 2.0,
        distanceKm: 9.8,
        etaMinutes: null,
        energyKwh: null,
        timeWindow: "00:10 - 00:50"
      },
      {
        id: "ORD-305",
        title: "Airport Corridor Drop",
        category: "Air Corridor",
        location: "VIP Road Airport Gate",
        x: 350,
        y: 160,
        priority: "standard",
        status: "infeasible",
        assignedVehicle: "none",
        infeasibleReason: "Inside active civil aviation restricted exclusion envelope",
        weightKg: 1.6,
        distanceKm: 11.2,
        etaMinutes: null,
        energyKwh: null,
        timeWindow: "00:20 - 01:00"
      },
      {
        id: "ORD-306",
        title: "Heavy Industrial Pump Spares (45kg)",
        category: "Industrial",
        location: "Govindpura Sector B",
        x: 1850,
        y: 690,
        priority: "standard",
        status: "completed",
        assignedVehicle: "ground",
        weightKg: 45.0,
        distanceKm: 8.6,
        etaMinutes: 32.0,
        energyKwh: 1.95,
        timeWindow: "00:10 - 01:00",
        completedAtSeconds: 2100
      }
    ],
    droneTrajectory: [
      { x: 1180, y: 860, t: 0, alt: 0 },
      { x: 1180, y: 860, t: 60, alt: 70 },
      // Rerouting around wind shear corridor
      { x: 1100, y: 700, t: 260, alt: 80 },
      { x: 1060, y: 520, t: 460, alt: 15 }, // ORD-301
      { x: 1260, y: 690, t: 660, alt: 85 },
      { x: 1450, y: 910, t: 840, alt: 15 }, // ORD-302
      { x: 1340, y: 1020, t: 1200, alt: 85 },
      { x: 1390, y: 1150, t: 1980, alt: 15 }, // ORD-303
      { x: 1180, y: 860, t: 3600, alt: 0 }
    ],
    groundTrajectory: [
      { x: 1180, y: 860, t: 0 },
      { x: 1360, y: 860, t: 700 },
      { x: 1690, y: 870, t: 1400 },
      { x: 1850, y: 690, t: 2100 }, // drop ORD-306
      { x: 1680, y: 1150, t: 3600 }
    ],
    metrics: {
      totalOrders: 20,
      droneDeliveries: 10,
      groundDeliveries: 5,
      infeasibleOrders: 5,
      avgDeliveryTimeMinutes: 17.5,
      droneAvgDeliveryTimeMinutes: 6.2,
      groundAvgDeliveryTimeMinutes: 24.8,
      droneAvgDistanceKm: 4.8,
      groundAvgDistanceKm: 6.4,
      droneEnergyKwh: 3.86,
      groundEnergyKwh: 8.90,
      optimalityGapPct: 2.8,
      totalEnergyUsedKwh: 12.76,
      feasibilityRatePct: 75.0
    }
  }
};
