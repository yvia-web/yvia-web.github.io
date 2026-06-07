var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path2 = __toESM(require("path"), 1);

// sqlite_sim.ts
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var DatabaseSimClass = class {
  constructor(filename) {
    this.data = {
      users: [],
      courses: [],
      events: [],
      event_registrations: [],
      emails_sent: []
    };
    this.filename = filename;
    const baseName = filename.endsWith(".db") ? filename.slice(0, -3) : filename;
    this.jsonPath = import_path.default.resolve(process.cwd(), `${baseName}.json`);
    this.load();
  }
  load() {
    try {
      if (import_fs.default.existsSync(this.jsonPath)) {
        const fileContent = import_fs.default.readFileSync(this.jsonPath, "utf-8");
        const parsed = JSON.parse(fileContent);
        this.data = {
          users: parsed.users || [],
          courses: parsed.courses || [],
          events: parsed.events || [],
          event_registrations: parsed.event_registrations || [],
          emails_sent: parsed.emails_sent || []
        };
        console.log(`[DB SIM] Loaded persisted records smoothly from: ${this.jsonPath}`);
      } else {
        console.log(`[DB SIM] Persistent file not found. Starting with fresh memory structure.`);
      }
    } catch (e) {
      console.error("[DB SIM] Load error. Starting empty:", e);
    }
  }
  async save() {
    try {
      import_fs.default.writeFileSync(this.jsonPath, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (e) {
      console.error("[DB SIM] Save error:", e);
    }
  }
  async exec(sql) {
    return;
  }
  async get(sql, params = []) {
    const trimmedSql = sql.trim().replace(/\s+/g, " ");
    const countMatch = trimmedSql.match(/SELECT COUNT\(\*\) as count FROM (\w+)/i);
    if (countMatch) {
      const tableName = countMatch[1].toLowerCase();
      const list = this.data[tableName] || [];
      return { count: list.length };
    }
    if (trimmedSql.includes("FROM event_registrations WHERE userId = ?")) {
      const userId = params[0];
      const count = this.data.event_registrations.filter((r) => r.userId === userId).length;
      return { count };
    }
    if (trimmedSql.includes("FROM users WHERE id = ?")) {
      const id = params[0];
      const u = this.data.users.find((user) => user.id === id);
      return u ? { ...u } : void 0;
    }
    if (trimmedSql.includes("FROM users WHERE email = ? COLLATE NOCASE") || trimmedSql.includes("FROM users WHERE email = ?")) {
      const email = params[0]?.trim().toLowerCase();
      const u = this.data.users.find((user) => user.email.toLowerCase() === email);
      return u ? { ...u } : void 0;
    }
    if (trimmedSql.includes("FROM event_registrations WHERE eventId = ? AND userId = ?")) {
      const [eventId, userId] = params;
      const reg = this.data.event_registrations.find((r) => r.eventId === eventId && r.userId === userId);
      return reg ? { ...reg } : void 0;
    }
    if (trimmedSql.includes("FROM events WHERE id = ?")) {
      const id = params[0];
      const e = this.data.events.find((evt) => evt.id === id);
      return e ? { ...e } : void 0;
    }
    return void 0;
  }
  async run(sql, params = []) {
    const trimmedSql = sql.trim().replace(/\s+/g, " ");
    const insertMatch = trimmedSql.match(/INSERT INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
    if (insertMatch) {
      const tableName = insertMatch[1].toLowerCase();
      const fields = insertMatch[2].split(",").map((str) => str.trim());
      const row = {};
      fields.forEach((field, index) => {
        row[field] = params[index];
      });
      if (!this.data[tableName]) {
        this.data[tableName] = [];
      }
      this.data[tableName].push(row);
      await this.save();
      return { lastID: row.id || Date.now().toString(), changes: 1 };
    }
    if (trimmedSql.includes("UPDATE users SET points = ? WHERE id = ?")) {
      const [points, id] = params;
      const user = this.data.users.find((u) => u.id === id);
      if (user) {
        user.points = points;
        await this.save();
      }
      return { changes: 1 };
    }
    if (trimmedSql.includes("UPDATE users") && trimmedSql.includes("fullName = ?")) {
      const [fullName, neighborhood, profession, professionalTitle, password, id] = params;
      const user = this.data.users.find((u) => u.id === id);
      if (user) {
        user.fullName = fullName;
        user.neighborhood = neighborhood;
        user.profession = profession;
        user.professionalTitle = professionalTitle;
        user.password = password;
        await this.save();
      }
      return { changes: 1 };
    }
    if (trimmedSql.includes("UPDATE courses SET approved = ? WHERE id = ?")) {
      const [approved, id] = params;
      const course = this.data.courses.find((c) => c.id === id);
      if (course) {
        course.approved = approved;
        await this.save();
      }
      return { changes: 1 };
    }
    if (trimmedSql.includes("UPDATE events SET approved = ?")) {
      const [approved, submissionStatus, id] = params;
      const event = this.data.events.find((e) => e.id === id);
      if (event) {
        event.approved = approved;
        event.submissionStatus = submissionStatus;
        await this.save();
      }
      return { changes: 1 };
    }
    return { changes: 0 };
  }
  async all(sql, params = []) {
    const trimmedSql = sql.trim().replace(/\s+/g, " ");
    if (trimmedSql.slice(0, 15).toUpperCase().includes("SELECT * FROM")) {
      const match = trimmedSql.match(/FROM\s+(\w+)/i);
      if (match) {
        const tableName = match[1].toLowerCase();
        let list = [...this.data[tableName] || []];
        if (trimmedSql.toUpperCase().includes("ORDER BY SUBMITTEDAT DESC")) {
          list.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
        } else if (trimmedSql.toUpperCase().includes("ORDER BY SENTAT DESC")) {
          list.sort((a, b) => b.sentAt.localeCompare(a.sentAt));
        }
        return list;
      }
    }
    if (trimmedSql.includes("COUNT(r.id) as attendeeCount") && trimmedSql.includes("FROM events")) {
      return this.data.events.map((e) => {
        const attendeeCount = this.data.event_registrations.filter((r) => r.eventId === e.id).length;
        return {
          ...e,
          attendeeCount
        };
      });
    }
    if (trimmedSql.includes("FROM event_registrations r JOIN events e")) {
      const userId = params[0];
      const userRegs = this.data.event_registrations.filter((r) => r.userId === userId).sort((a, b) => b.registeredAt.localeCompare(a.registeredAt));
      return userRegs.map((r) => {
        const matchedEvent = this.data.events.find((evt) => evt.id === r.eventId) || {};
        return {
          registrationId: r.id,
          registeredAt: r.registeredAt,
          id: matchedEvent.id,
          title: matchedEvent.title,
          titleZh: matchedEvent.titleZh,
          status: matchedEvent.status,
          location: matchedEvent.location,
          date: matchedEvent.date,
          description: matchedEvent.description,
          descriptionZh: matchedEvent.descriptionZh,
          targetAudience: matchedEvent.targetAudience,
          images: matchedEvent.images,
          approved: matchedEvent.approved,
          submissionStatus: matchedEvent.submissionStatus
        };
      });
    }
    return [];
  }
};
async function open(options) {
  const db2 = new DatabaseSimClass(options.filename);
  return db2;
}

// server.ts
var import_vite = require("vite");
var PORT = 3e3;
var DB_FILE = "d1_sim.db";
var staticCourses = [
  {
    id: "scratchmaths",
    name: "UCL ScratchMaths",
    nameZh: "UCL ScratchMaths",
    source: "UCL Knowledge Lab (University College London)",
    ageGroup: "Ages 9-11 (Primary Years)",
    duration: "10-12 Weeks Course",
    keyConcepts: [
      "Geometry & Spatial Directions",
      "Algorithms & Iteration",
      "Variables & Coordinate Systems",
      "Pattern Copying and Scale"
    ],
    description: "Developed by the world-class UCL Knowledge Lab, ScratchMaths links computer programming with Key Stage 2 mathematical content. Under YVIA peer mentors, students dive deep into the Scratch programming block syntax to explore geometry, symmetries, variables, and coordinate grids, shifting from passive screen users to creative mathematically minded programmers.",
    descriptionZh: "Developed by the world-class UCL Knowledge Lab, ScratchMaths links computer programming with Key Stage 2 mathematical content. Under YVIA peer mentors, students dive deep into the Scratch programming block syntax to explore geometry, symmetries, variables, and coordinate grids, shifting from passive screen users to creative mathematically minded programmers.",
    images: [
      "/src/assets/images/scratch_maths_learning_1780441786319.png",
      "/src/assets/images/scratch_maths_art_1780441801018.png",
      "/src/assets/images/scratch_maths_peer_1780441816378.png",
      "/src/assets/images/scratch_maths_interface_1780441832376.png"
    ],
    approved: true
  },
  {
    id: "drone",
    name: "Drone Robotics & Autonomous Control",
    nameZh: "Drone Robotics & Autonomous Control",
    source: "YVIA Applied STEM Curriculum",
    ageGroup: "Ages 11-15 (Intermediate & High School)",
    duration: "8-10 Weeks Course",
    keyConcepts: [
      "Aerodynamics & Physics of Flight",
      "Autonomous Pilot Programming",
      "Coordinates in 3D Space",
      "Sensor Feedback & Telemetry"
    ],
    description: "Our Drone program bridges the gap between software programming and physical mechanics. Moving beyond standard screen play, students assemble educational quadcopters, learn physical laws of lift, yaw, pitch, and roll, and write precise autonomous path scripts using Block-based languages and Python to navigate obstacle courses.",
    descriptionZh: "Our Drone program bridges the gap between software programming and physical mechanics. Moving beyond standard screen play, students assemble educational quadcopters, learn physical laws of lift, yaw, pitch, and roll, and write precise autonomous path scripts using Block-based languages and Python to navigate obstacle courses.",
    images: [
      "/src/assets/images/drone_assembly_1780442981249.png",
      "/src/assets/images/drone_coding_pure_1780443362735.png",
      "/src/assets/images/drone_flight_1780443008643.png",
      "/src/assets/images/drone_physics_1780443022348.png"
    ],
    approved: true
  },
  {
    id: "zmrobo",
    name: "Modular Intelligent Robotics (MIR)",
    nameZh: "Modular Intelligent Robotics",
    source: "Robotics Education Ecosystem",
    ageGroup: "Ages 8-13 (Junior STEM)",
    duration: "8-12 Weeks Course",
    keyConcepts: [
      "Sensory-Motor Control Loops",
      "Structural Engineering & Mechanics",
      "Conditional Logic & Branching",
      "Real-world Problem Solving"
    ],
    description: "MIR combines high-precision modular joints, complex gears, and interactive sensors with block programming. Students design, build, and program physical robot prototypes (e.g. intelligent sorters, line-trackers) to explore the basics of engineering design, tactile learning, and system logic.",
    descriptionZh: "MIR combines high-precision modular joints, complex gears, and interactive sensors with block programming. Students design, build, and program physical robot prototypes (e.g. intelligent sorters, line-trackers) to explore the basics of engineering design, tactile learning, and system logic.",
    images: [
      "/src/assets/images/zmrobo_assembly_1780443384038.png",
      "/src/assets/images/zmrobo_sensor_1780443400305.png",
      "/src/assets/images/zmrobo_programming_1780443416555.png",
      "/src/assets/images/zmrobo_mechanics_1780443454422.png"
    ],
    approved: true
  },
  {
    id: "hawgent",
    name: "Dynamic Visual Mathematics (DVM)",
    nameZh: "Dynamic Visual Mathematics",
    source: "Technology & Research Center",
    ageGroup: "Ages 10-15 (Interactive Visuals)",
    duration: "6-8 Weeks Course",
    keyConcepts: [
      "Dynamic Geometric Models",
      "Visualizing Algebraic Formulae",
      "3D Coordinate Projections",
      "Interactive Functions & Tracing"
    ],
    description: "Featuring Maths professional visual-dynamic software suites, this course transforms static formulas and plane geometries into touchable, draggable interactive elements. Students develop intense geometric intuition and easily grasp algebraic equations by watching variables morph in real-time.",
    descriptionZh: "Featuring Maths professional visual-dynamic software suites, this course transforms static formulas and plane geometries into touchable, draggable interactive elements. Students develop intense geometric intuition and easily grasp algebraic equations by watching variables morph in real-time.",
    images: [
      "/src/assets/images/hawgent_dynamic_geometry_1780443868827.png",
      "/src/assets/images/hawgent_trigonometry_1780443884256.png",
      "/src/assets/images/hawgent_algebra_blocks_1780443899111.png",
      "/src/assets/images/hawgent_3d_projection_1780443911575.png"
    ],
    approved: true
  },
  {
    id: "secondarymaths",
    name: "Creative Middle & Secondary Mathematics",
    nameZh: "Creative Middle & Secondary Mathematics",
    source: "YVIA Deep Thinking Curriculum",
    ageGroup: "Ages 12-16 (Middle School Maths)",
    duration: "10 Weeks Course",
    keyConcepts: [
      "Logical Deduction & Proof Writing",
      "Statistics, Probability & Data Science",
      "Calculus Intuitives & Infinite Series",
      "Cryptographic Functions & Game Theory"
    ],
    description: "Specifically tailored for secondary levels, this course focuses on peer-led mathematical inquiry. Rather than rote homework drills, YVIA peer leaders guide students through mathematical beauties: visual proofs without words, real-world data analysis, introductory cryptography, and logical challenge design.",
    descriptionZh: "Specifically tailored for secondary levels, this course focuses on peer-led mathematical inquiry. Rather than rote homework drills, YVIA peer leaders guide students through mathematical beauties: visual proofs without words, real-world data analysis, introductory cryptography, and logical challenge design.",
    images: [
      "/src/assets/images/secmaths_chalkboard_1780444627246.png",
      "/src/assets/images/secmaths_precision_1780444643265.png",
      "/src/assets/images/secmaths_academic_1780444658617.png",
      "/src/assets/images/secmaths_homework_1780444674614.png"
    ],
    approved: true
  },
  {
    id: "aico-creation",
    name: "AI Co-Creation & Playability Workshop",
    nameZh: "AI Co-Creation & Playability Workshop",
    source: "YVIA Next-Gen AI Technology",
    ageGroup: "Ages 10-18 (AI Agency & Play)",
    duration: "8 Weeks Workshop",
    keyConcepts: [
      "Mastering AI Agency & Ownership",
      "Peer-led Group Collaboration",
      "Enhancing Real-World Playability",
      "Physical-Digital Hybrid Interaction"
    ],
    description: 'Empower kids to master AI as creative owners rather than mere consumers. Combining "peer group collaboration" with "real-world playability," this workshop guides students to integrate AI tools with physical media (tabletop board games, plant tokens, smart artifacts) to redesign interactive loops in their immediate surroundings.',
    descriptionZh: 'Empower kids to master AI as creative owners rather than mere consumers. Combining "peer group collaboration" with "real-world playability," this workshop guides students to integrate AI tools with physical media (tabletop board games, plant tokens, smart artifacts) to redesign interactive loops in their immediate surroundings.',
    images: [
      "/src/assets/images/aico_collaboration_1780446541477.png",
      "/src/assets/images/aico_prompt_design_1780445344415.png",
      "/src/assets/images/aico_storyboard_1780445362724.png",
      "/src/assets/images/aico_play_physical_1780446864951.png"
    ],
    approved: true
  }
];
var staticEvents = [
  {
    id: "aicocamp",
    title: "AI Co-Creation Camp: Playability in Uncertainty",
    titleZh: "AI Co-Creation Camp: Playability in Uncertainty",
    status: "past",
    location: "Rototuna Library, Hamilton, New Zealand",
    date: "Held: May 2026",
    description: "We will guide all participants to use AI tools to transform daily life into fun, interactive experiences. Through teamwork, we nurture children's innovative thinking and AI application skills while enhancing interaction among participants and exploring the endless possibilities of AI and playability together. Based on Citizens of Play references.",
    descriptionZh: "We will guide all participants to use AI tools to transform daily life into fun, interactive experiences. Through teamwork, we nurture children's innovative thinking and AI application skills while enhancing interaction among participants and exploring the endless possibilities of AI and playability together. Based on Citizens of Play references.",
    targetAudience: "Youth & Family Teams (7-16 years with parents)",
    images: [
      "/src/assets/images/aico_collaboration_1780446541477.png",
      "/src/assets/images/aico_prompt_design_1780445344415.png",
      "/src/assets/images/aico_storyboard_1780445362724.png",
      "/src/assets/images/aico_play_physical_1780446864951.png"
    ],
    approved: true,
    creatorId: null,
    creatorEmail: null,
    submissionStatus: "approved"
  },
  {
    id: "explore-scratch",
    title: "Exploring with UCL ScratchMaths",
    titleZh: "Exploring with UCL ScratchMaths",
    status: "upcoming",
    location: "Rototuna Library, Hamilton, New Zealand",
    date: "Upcoming: June 2026",
    description: "Dive directly into the ScratchMaths curriculum with hands-on, interactive computer challenges. Guided by YVIA youth peer leaders, children will learn how geometric angles trace beautiful spiral art and code their very first mathematically verified coordinate-chasing arcade game.",
    descriptionZh: "Dive directly into the ScratchMaths curriculum with hands-on, interactive computer challenges. Guided by YVIA youth peer leaders, children will learn how geometric angles trace beautiful spiral art and code their very first mathematically verified coordinate-chasing arcade game.",
    targetAudience: "Suggested Ages 8-12 (No laptop required, YVIA provided)",
    images: [
      "/src/assets/images/scratch_maths_learning_1780441786319.png",
      "/src/assets/images/scratch_maths_peer_1780441816378.png",
      "/src/assets/images/scratch_maths_art_1780441801018.png",
      "/src/assets/images/scratch_maths_interface_1780441832376.png"
    ],
    approved: true,
    creatorId: null,
    creatorEmail: null,
    submissionStatus: "approved"
  }
];
var db;
async function initializeDatabase() {
  db = await open({
    filename: DB_FILE
  });
  await db.exec("PRAGMA foreign_keys = ON;");
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      fullName TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      country TEXT,
      city TEXT,
      neighborhood TEXT,
      profession TEXT,
      professionalTitle TEXT,
      desiredTracks TEXT, -- JSON string array
      surplusSkills TEXT, -- JSON string array
      submittedAt TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      level TEXT DEFAULT 'Graduate Node',
      points INTEGER DEFAULT 10
    );
  `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      nameZh TEXT NOT NULL,
      source TEXT NOT NULL,
      description TEXT NOT NULL,
      descriptionZh TEXT NOT NULL,
      ageGroup TEXT NOT NULL,
      duration TEXT NOT NULL,
      keyConcepts TEXT NOT NULL, -- JSON string array
      images TEXT NOT NULL, -- JSON string array
      approved INTEGER DEFAULT 1,
      notes TEXT
    );
  `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      titleZh TEXT NOT NULL,
      status TEXT NOT NULL, -- 'past' | 'upcoming'
      location TEXT NOT NULL,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      descriptionZh TEXT NOT NULL,
      targetAudience TEXT NOT NULL,
      images TEXT NOT NULL, -- JSON string array
      approved INTEGER DEFAULT 1,
      notes TEXT,
      creatorId TEXT,
      creatorEmail TEXT,
      submissionStatus TEXT DEFAULT 'approved', -- 'approved' | 'pending' | 'rejected'
      FOREIGN KEY(creatorId) REFERENCES users(id) ON DELETE SET NULL
    );
  `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS event_registrations (
      id TEXT PRIMARY KEY,
      eventId TEXT NOT NULL,
      userId TEXT NOT NULL,
      userEmail TEXT NOT NULL,
      fullName TEXT NOT NULL,
      registeredAt TEXT NOT NULL,
      FOREIGN KEY(eventId) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(eventId, userId)
    );
  `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS emails_sent (
      id TEXT PRIMARY KEY,
      toEmail TEXT NOT NULL,
      subject TEXT NOT NULL,
      content TEXT NOT NULL,
      sentAt TEXT NOT NULL
    );
  `);
  const usersCount = await db.get("SELECT COUNT(*) as count FROM users");
  if (usersCount && usersCount.count === 0) {
    console.log("Seeding initial users into SQLite Database...");
    const sampleUsers = [
      {
        id: "cf-reg-1",
        fullName: "Alifelix Vance",
        email: "af.vance@waikato.ac.nz",
        password: "af.vance",
        // Default email prefix password
        country: "New Zealand",
        city: "Hamilton",
        neighborhood: "Rototuna North",
        profession: "Senior Firmware Architect",
        professionalTitle: "Director of Embedded Robotics",
        desiredTracks: JSON.stringify(["Mentor_Track", "Growth_Track"]),
        surplusSkills: JSON.stringify(["Outputs_Professional", "Outputs_Space"]),
        submittedAt: "2026-06-01T10:44:00Z",
        role: "user",
        level: "Silicon Expert Node",
        points: 400
      },
      {
        id: "cf-reg-2",
        fullName: "Dr. Clara Hastings",
        email: "clara.hastings@geometry.org",
        password: "clara.hastings",
        country: "United Kingdom",
        city: "London",
        neighborhood: "Bloomsbury",
        profession: "Mathematical Computing Lecturer",
        professionalTitle: "Research Fellow, UCL Knowledge Lab",
        desiredTracks: JSON.stringify(["Growth_Track", "Prosumer_Track"]),
        surplusSkills: JSON.stringify(["Outputs_Mentoring", "Outputs_Professional"]),
        submittedAt: "2026-06-02T14:12:30Z",
        role: "user",
        level: "Academic Research Leader Node",
        points: 300
      },
      {
        id: "cf-reg-3",
        fullName: "Zimol Zhang",
        email: "zimol.zhang@outlook.com",
        password: "zimol.zhang",
        country: "China",
        city: "Shenzhen",
        neighborhood: "Nanshan Tech Park",
        profession: "AI Hardware Student Maker",
        professionalTitle: "Youth Lead Team Lead",
        desiredTracks: JSON.stringify(["Mentee_Track", "Mentor_Track"]),
        surplusSkills: JSON.stringify(["Outputs_Mentoring", "Outputs_Cross_Support"]),
        submittedAt: "2026-06-02T22:15:22Z",
        role: "user",
        level: "Junior STEM Maker Node",
        points: 50
      }
    ];
    for (const u of sampleUsers) {
      await db.run(
        `INSERT INTO users (id, fullName, email, password, country, city, neighborhood, profession, professionalTitle, desiredTracks, surplusSkills, submittedAt, role, level, points)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [u.id, u.fullName, u.email, u.password, u.country, u.city, u.neighborhood, u.profession, u.professionalTitle, u.desiredTracks, u.surplusSkills, u.submittedAt, u.role, u.level, u.points]
      );
    }
  }
  const coursesCount = await db.get("SELECT COUNT(*) as count FROM courses");
  if (coursesCount && coursesCount.count === 0) {
    console.log("Seeding default courses into SQLite Database...");
    for (const c of staticCourses) {
      await db.run(
        `INSERT INTO courses (id, name, nameZh, source, description, descriptionZh, ageGroup, duration, keyConcepts, images, approved, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [c.id, c.name, c.nameZh, c.source, c.description, c.descriptionZh, c.ageGroup, c.duration, JSON.stringify(c.keyConcepts), JSON.stringify(c.images), c.approved ? 1 : 0, c.notes || ""]
      );
    }
  }
  const eventsCount = await db.get("SELECT COUNT(*) as count FROM events");
  if (eventsCount && eventsCount.count === 0) {
    console.log("Seeding default events into SQLite Database...");
    for (const e of staticEvents) {
      await db.run(
        `INSERT INTO events (id, title, titleZh, status, location, date, description, descriptionZh, targetAudience, images, approved, notes, creatorId, creatorEmail, submissionStatus)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [e.id, e.title, e.titleZh, e.status, e.location, e.date, e.description, e.descriptionZh, e.targetAudience, JSON.stringify(e.images), e.approved ? 1 : 0, e.notes || "", e.creatorId, e.creatorEmail, e.submissionStatus]
      );
    }
  }
  console.log("Database initialized successfully with seeded tables.");
}
async function queueEmail(toEmail, subject, content) {
  const id = "email-" + Date.now() + Math.floor(Math.random() * 1e3);
  const sentAt = (/* @__PURE__ */ new Date()).toISOString();
  await db.run(
    "INSERT INTO emails_sent (id, toEmail, subject, content, sentAt) VALUES (?, ?, ?, ?, ?)",
    [id, toEmail, subject, content, sentAt]
  );
  console.log(`[MAIL DISPATCHED] to: ${toEmail} | sub: "${subject}"`);
}
async function startServer() {
  await initializeDatabase();
  const app = (0, import_express.default)();
  app.use(import_express.default.json());
  app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = await db.get("SELECT * FROM users WHERE email = ? COLLATE NOCASE", [email.trim()]);
      if (!user) {
        return res.status(401).json({ error: "Invalid Email Address." });
      }
      if (user.password !== password) {
        return res.status(412).json({ error: "Incorrect Security Passphrase." });
      }
      const resUser = {
        ...user,
        desiredTracks: JSON.parse(user.desiredTracks || "[]"),
        surplusSkills: JSON.parse(user.surplusSkills || "[]")
      };
      res.json(resUser);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/register", async (req, res) => {
    try {
      const {
        fullName = "",
        email = "",
        country = "",
        city = "",
        neighborhood = "",
        profession = "",
        professionalTitle = "",
        desiredTracks = [],
        surplusSkills = []
      } = req.body || {};
      const emailLower = String(email || "").trim().toLowerCase();
      if (!emailLower) {
        return res.status(400).json({ error: "Email is required." });
      }
      const cleanFullName = String(fullName || "").trim();
      if (!cleanFullName) {
        return res.status(400).json({ error: "Full name is required." });
      }
      const existing = await db.get("SELECT id FROM users WHERE email = ?", [emailLower]);
      if (existing) {
        return res.status(409).json({ error: "Email already registered in system." });
      }
      const cleanCountry = String(country || "").trim();
      const cleanCity = String(city || "").trim();
      const cleanNeighborhood = String(neighborhood || "").trim();
      const cleanProfession = String(profession || "").trim();
      const cleanProfessionalTitle = String(professionalTitle || "").trim() || "STEM Participant";
      const cleanDesiredTracks = Array.isArray(desiredTracks) ? desiredTracks : [];
      const cleanSurplusSkills = Array.isArray(surplusSkills) ? surplusSkills : [];
      const id = "cf-" + Date.now();
      const defaultPassword = emailLower.split("@")[0] || "password123";
      const submittedAt = (/* @__PURE__ */ new Date()).toISOString();
      let level = "Graduate Node Member";
      if (cleanSurplusSkills.includes("Outputs_Professional") || cleanSurplusSkills.includes("Outputs_Space")) {
        level = "Silicon Expert Node";
      } else if (cleanSurplusSkills.includes("Outputs_Mentoring")) {
        level = "Academic Research Leader Node";
      } else if (cleanDesiredTracks.includes("Mentee_Track")) {
        level = "Junior STEM Maker Node";
      }
      await db.run(
        `INSERT INTO users (id, fullName, email, password, country, city, neighborhood, profession, professionalTitle, desiredTracks, surplusSkills, submittedAt, role, level, points)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          cleanFullName,
          emailLower,
          defaultPassword,
          cleanCountry,
          cleanCity,
          cleanNeighborhood,
          cleanProfession,
          cleanProfessionalTitle,
          JSON.stringify(cleanDesiredTracks),
          JSON.stringify(cleanSurplusSkills),
          submittedAt,
          "user",
          level,
          15
        ]
      );
      const mailContent = `
Hello ${cleanFullName}! 

Welcome to the YVIA Decentralized Cooperative STEM Grid Network (YVIA HUB 2.0). 
Your nodes have successfully joined our matching mesh coordinate.

Here are your initial ingress credentials:
\u2022 Identifier/Username: ${emailLower}
\u2022 Default Security Passphrase: ${defaultPassword}

\u26A0\uFE0F ACTION REQUIRED: To protect your network credentials from unauthorized tampering, please log in to your YVIA Hub profile portal (https://ai.studio/build), open the "Profile & Security settings" panel, and IMMEDIATELY modify your default passphrase.

Ecosystem Assignment:
\u2022 Calculated Role Level: ${level}
\u2022 Base Grid Power: 15 Gp

We are incredibly excited to bring high-tier hardware integration to your neighborhood.

Best wishes,
YVIA Core Infrastructure Automation Agent
      `.trim();
      await queueEmail(emailLower, "Welcome to YVIA Grid! [Credentials Security Notice]", mailContent);
      const registeredUser = await db.get("SELECT * FROM users WHERE id = ?", [id]);
      const responseUser = {
        ...registeredUser,
        desiredTracks: JSON.parse(registeredUser.desiredTracks || "[]"),
        surplusSkills: JSON.parse(registeredUser.surplusSkills || "[]")
      };
      res.status(201).json(responseUser);
    } catch (e) {
      console.error("Crash in custom registration endpoint:", e);
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/user/update", async (req, res) => {
    try {
      const { id, fullName = "", neighborhood = "", profession = "", professionalTitle = "", password = "" } = req.body || {};
      const user = await db.get("SELECT * FROM users WHERE id = ?", [id]);
      if (!user) {
        return res.status(404).json({ error: "User profile not found." });
      }
      await db.run(
        `UPDATE users 
         SET fullName = ?, neighborhood = ?, profession = ?, professionalTitle = ?, password = ?
         WHERE id = ?`,
        [
          String(fullName || "").trim(),
          String(neighborhood || "").trim(),
          String(profession || "").trim(),
          String(professionalTitle || "").trim(),
          String(password || "").trim(),
          id
        ]
      );
      const updatedUser = await db.get("SELECT * FROM users WHERE id = ?", [id]);
      const resUser = {
        ...updatedUser,
        desiredTracks: JSON.parse(updatedUser.desiredTracks || "[]"),
        surplusSkills: JSON.parse(updatedUser.surplusSkills || "[]")
      };
      res.json(resUser);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/submissions", async (req, res) => {
    try {
      const users = await db.all("SELECT * FROM users ORDER BY submittedAt DESC");
      const parsedUsers = users.map((u) => ({
        ...u,
        desiredTracks: JSON.parse(u.desiredTracks || "[]"),
        surplusSkills: JSON.parse(u.surplusSkills || "[]")
      }));
      res.json(parsedUsers);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/courses", async (req, res) => {
    try {
      const courses = await db.all("SELECT * FROM courses");
      const parsed = courses.map((c) => ({
        ...c,
        keyConcepts: JSON.parse(c.keyConcepts || "[]"),
        images: JSON.parse(c.images || "[]"),
        approved: c.approved === 1
      }));
      res.json(parsed);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/courses/toggle-approve", async (req, res) => {
    const { id, approved } = req.body;
    try {
      await db.run("UPDATE courses SET approved = ? WHERE id = ?", [approved ? 1 : 0, id]);
      res.json({ success: true, id, approved });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/events", async (req, res) => {
    try {
      const query = `
        SELECT e.*, COUNT(r.id) as attendeeCount 
        FROM events e
        LEFT JOIN event_registrations r ON e.id = r.eventId
        GROUP BY e.id
      `;
      const events = await db.all(query);
      const parsed = events.map((e) => ({
        ...e,
        images: JSON.parse(e.images || "[]"),
        approved: e.approved === 1,
        attendeeCount: e.attendeeCount || 0
      }));
      res.json(parsed);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/events/initiate", async (req, res) => {
    const {
      title,
      location,
      date,
      description,
      targetAudience,
      images,
      creatorId,
      creatorEmail
    } = req.body;
    try {
      const user = await db.get("SELECT level, points FROM users WHERE id = ?", [creatorId]);
      if (!user) {
        return res.status(403).json({ error: "Host User Node not found in registry." });
      }
      const regCount = await db.get("SELECT COUNT(*) as count FROM event_registrations WHERE userId = ?", [creatorId]);
      const meetsCondition = user.level && user.level.includes("Silicon") || user.level && user.level.includes("Academic") || user.level && user.level.includes("Systems") || regCount && regCount.count >= 1;
      if (!meetsCondition) {
        return res.status(403).json({
          error: "Inadequate Grid Reputation. To host a decentralized playability event, you must either possess a Pioneer level node ('Silicon Expert'/'Academic Leader') OR have actively participated as a registered attendee in at least 1 verified YVIA event."
        });
      }
      const id = "evt-" + Date.now();
      const imgsJson = JSON.stringify(images && images.length > 0 ? images : ["/src/assets/images/aico_collaboration_1780446541477.png"]);
      await db.run(
        `INSERT INTO events (id, title, titleZh, status, location, date, description, descriptionZh, targetAudience, images, approved, notes, creatorId, creatorEmail, submissionStatus)
         VALUES (?, ?, ?, 'upcoming', ?, ?, ?, ?, ?, ?, 0, '', ?, ?, 'pending')`,
        [id, title, title, location, date, description, description, targetAudience, imgsJson, creatorId, creatorEmail]
      );
      const emailContent = `
Hello ${creatorEmail}!

Your YVIA Event proposal: "${title}" has been successfully broadcast to the grid mesh. 

Status: [\u{1F512} PENDING REVIEW]
Submitted Coords: ${location} | Scheduled: ${date}

Your proposal is currently queued for security audit by network administrators. Once approved, the event will instantly publish on the Events roster under the "Cooperative Grid Initiated Events" sector. You will receive an automated dispatch email on approval.

Thank you for fueling peer STEM leadership!

Sincerely,
YVIA Core Infrastructure Automation Agent
      `.trim();
      await queueEmail(creatorEmail, `Event Proposal Logged: ${title}`, emailContent);
      res.status(201).json({ success: true, message: "Event initiated. Sent for administrator review." });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/events/toggle-approve", async (req, res) => {
    const { id, approved, submissionStatus } = req.body;
    try {
      const event = await db.get("SELECT * FROM events WHERE id = ?", [id]);
      if (!event) {
        return res.status(404).json({ error: "Mesh event not found." });
      }
      const statusVal = submissionStatus || (approved ? "approved" : "pending");
      const approvedNum = approved ? 1 : 0;
      await db.run(
        "UPDATE events SET approved = ?, submissionStatus = ? WHERE id = ?",
        [approvedNum, statusVal, id]
      );
      if (event.creatorEmail) {
        let subject = `YVIA Mesh Update: Event Proposal Audit Complete`;
        let mailContent = "";
        if (statusVal === "approved") {
          subject = `Approved: YVIA Custom Event Confirmed for Display [${event.title}]`;
          mailContent = `
Dear Host ${event.creatorEmail},

Congratulations! Your customized YVIA Citizen Playability event proposal has passed mesh security audits.

\u2022 Event Node: "${event.title}"
\u2022 Grid Location: ${event.location}
\u2022 Status: [\u2705 ACTIVE DISPLAY]

The event is now officially active and listed on the YVIA grid system. Registered members can now start signing up!

Best of luck with your event,
YVIA Core Infrastructure Automation Agent
          `.trim();
        } else if (statusVal === "rejected") {
          subject = `Audit Update: Event Proposal Returned for Refinement`;
          mailContent = `
Dear Host ${event.creatorEmail},

Your event proposal: "${event.title}" has been reviewed by administrators. This node has been returned for refinement.

\u2022 Event Node: "${event.title}"
\u2022 Status: [\u274C REFINED/REJECTED]

Please feel free to resubmit an updated proposal matching local youth hardware guidelines at your leisure.

Sincerely,
YVIA Core Infrastructure Automation Agent
          `.trim();
        }
        if (mailContent) {
          await queueEmail(event.creatorEmail, subject, mailContent);
        }
      }
      res.json({ success: true, id, approved, submissionStatus: statusVal });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/events/register", async (req, res) => {
    const { eventId, userId } = req.body;
    try {
      const event = await db.get("SELECT * FROM events WHERE id = ?", [eventId]);
      if (!event) {
        return res.status(404).json({ error: "Requested event is unavailable." });
      }
      if (event.approved === 0 || event.submissionStatus !== "approved") {
        return res.status(400).json({ error: "Event is not approved or currently active for registrations." });
      }
      const user = await db.get("SELECT fullName, email, points FROM users WHERE id = ?", [userId]);
      if (!user) {
        return res.status(404).json({ error: "User credential profile not found." });
      }
      const existing = await db.get(
        "SELECT id FROM event_registrations WHERE eventId = ? AND userId = ?",
        [eventId, userId]
      );
      if (existing) {
        return res.status(409).json({ error: "You are already actively registered for this event." });
      }
      const id = "reg-link-" + Date.now();
      const registeredAt = (/* @__PURE__ */ new Date()).toISOString();
      await db.run(
        `INSERT INTO event_registrations (id, eventId, userId, userEmail, fullName, registeredAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, eventId, userId, user.email, user.fullName, registeredAt]
      );
      const newPoints = (user.points || 0) + 50;
      await db.run("UPDATE users SET points = ? WHERE id = ?", [newPoints, userId]);
      const emailContent = `
Dear ${user.fullName},

We have safely processed your registration for YVIA Citizen playability event!

\u2022 Event: "${event.title}"
\u2022 Host Location: ${event.location}
\u2022 Time Scheduled: ${event.date}
\u2022 Ticket Ingress: ${id}

\u{1F4CA} Reputation Award: You earned +50 Gp (Grid Power reputation). 
Your current Grid reputation is: ${newPoints} Gp.

Thank you for choosing to integrate tech learning directly into your community. We hope to see you there!

Sincerely,
YVIA Core Infrastructure Automation Agent
      `.trim();
      await queueEmail(user.email, `Registration Confirmed: ${event.title}`, emailContent);
      res.status(201).json({ success: true, newPoints });
    } catch (e) {
      if (e.message.includes("UNIQUE")) {
        return res.status(409).json({ error: "You are already actively registered for this event." });
      }
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/user/registrations", async (req, res) => {
    const { userId } = req.query;
    try {
      const query = `
        SELECT r.id as registrationId, r.registeredAt, e.*
        FROM event_registrations r
        JOIN events e ON r.eventId = e.id
        WHERE r.userId = ?
        ORDER BY r.registeredAt DESC
      `;
      const list = await db.all(query, [userId]);
      const parsed = list.map((item) => ({
        registrationId: item.registrationId,
        registeredAt: item.registeredAt,
        event: {
          id: item.id,
          title: item.title,
          titleZh: item.titleZh,
          status: item.status,
          location: item.location,
          date: item.date,
          description: item.description,
          descriptionZh: item.descriptionZh,
          targetAudience: item.targetAudience,
          images: JSON.stringify(item.images),
          // stringified so component can handle consistently if parsed
          approved: item.approved === 1,
          submissionStatus: item.submissionStatus
        }
      }));
      res.json(parsed);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/emails", async (req, res) => {
    try {
      const logs = await db.all("SELECT * FROM emails_sent ORDER BY sentAt DESC");
      res.json(logs);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/admin/export", async (req, res) => {
    try {
      const users = await db.all("SELECT * FROM users");
      const courses = await db.all("SELECT * FROM courses");
      const events = await db.all("SELECT * FROM events");
      const registrations = await db.all("SELECT * FROM event_registrations");
      const emails = await db.all("SELECT * FROM emails_sent");
      res.json({
        exportDate: (/* @__PURE__ */ new Date()).toISOString(),
        users,
        courses,
        events,
        registrations,
        emails
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path2.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path2.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[FULLSTACK GRID SERVER RUNNING] http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
