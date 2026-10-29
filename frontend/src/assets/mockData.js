// Database-aligned schema structure for scalable Node.js/Express API migration
export const initialProjects = [
  {
    id: 1,
    name: "Phoenix Client Dashboard",
    description: "Modernizing the key legacy client analytics portal with real-time web socket data feeds.",
    progress: 78,
    status: "In Progress",
    dueDate: "2025-04-15",
    teamName: "Alpha Squad",
    teamMembers: ["Keerthi", "Sarah Connor", "Alex Mercer", "David Miller"],
    techStack: ["React", "Node.js", "Socket.io", "PostgreSQL", "Recharts"]
  },
  {
    id: 2,
    name: "Global Inventory API",
    description: "High-throughput RESTful inventory gateway servicing 12 regional fulfillment microservices.",
    progress: 40,
    status: "Planning",
    dueDate: "2025-05-30",
    teamName: "Backend Core",
    teamMembers: ["Keerthi", "Suresh Kumar", "Elena Rostova"],
    techStack: ["Express", "MongoDB", "Redis", "Docker", "AWS ECS"]
  },
  {
    id: 3,
    name: "AI Copilot Integration",
    description: "Injecting fine-tuned LLM completion and code generation agents inside the customer support console.",
    progress: 100,
    status: "Completed",
    dueDate: "2025-02-10",
    teamName: "Cognitive Labs",
    teamMembers: ["Sarah Connor", "Alex Mercer", "Diana Prince"],
    techStack: ["Python", "FastAPI", "LangChain", "OpenAI API", "VectorDB"]
  },
  {
    id: 4,
    name: "Mobile Wallet Refresh",
    description: "Redesigning checkout pathways and face-ID biometric handshakes inside the Android/iOS client.",
    progress: 15,
    status: "In Progress",
    dueDate: "2025-06-25",
    teamName: "Mobile Edge",
    teamMembers: ["David Miller", "Bruce Wayne", "Clark Kent"],
    techStack: ["React Native", "TypeScript", "Redux Toolkit", "Biometrics API"]
  }
];

export const initialTasks = [
  // Phoenix Client Dashboard (ID: 1)
  {
    id: 101,
    projectId: 1,
    title: "Implement Live Charts",
    status: "Completed",
    dueDate: "2025-02-28",
    assignedTo: "Keerthi",
    onTime: true
  },
  {
    id: 102,
    projectId: 1,
    title: "Configure PostgreSQL Schema",
    status: "Completed",
    dueDate: "2025-02-20",
    assignedTo: "Alex Mercer",
    onTime: true
  },
  {
    id: 103,
    projectId: 1,
    title: "WebSocket Connection Optimization",
    status: "In Progress",
    dueDate: "2025-03-10",
    assignedTo: "Sarah Connor",
    onTime: false
  },
  {
    id: 104,
    projectId: 1,
    title: "Draft End-To-End Test Suite",
    status: "To Do",
    dueDate: "2025-03-01", // Past due, uncompleted = Overdue task
    assignedTo: "David Miller",
    onTime: false
  },

  // Global Inventory API (ID: 2)
  {
    id: 201,
    projectId: 2,
    title: "Define Swagger API Specs",
    status: "Completed",
    dueDate: "2025-02-22",
    assignedTo: "Suresh Kumar",
    onTime: true
  },
  {
    id: 202,
    projectId: 2,
    title: "Dockerize Database Containers",
    status: "To Do",
    dueDate: "2025-04-10",
    assignedTo: "Elena Rostova",
    onTime: false
  },
  {
    id: 203,
    projectId: 2,
    title: "Redis Cache Layer Architecture",
    status: "To Do",
    dueDate: "2025-04-30",
    assignedTo: "", // Unassigned to test Assignment Coverage
    onTime: false
  },

  // AI Copilot Integration (ID: 3)
  {
    id: 301,
    projectId: 3,
    title: "Fine-tune OpenAI Prompt templates",
    status: "Completed",
    dueDate: "2025-01-15",
    assignedTo: "Sarah Connor",
    onTime: true
  },
  {
    id: 302,
    projectId: 3,
    title: "Implement Token Cost Rate Limiter",
    status: "Completed",
    dueDate: "2025-02-05",
    assignedTo: "Alex Mercer",
    onTime: true
  },

  // Mobile Wallet Refresh (ID: 4)
  {
    id: 401,
    projectId: 4,
    title: "Design Figma UI Layouts",
    status: "In Progress",
    dueDate: "2025-03-05", // Overdue if past current date and not completed
    assignedTo: "Bruce Wayne",
    onTime: false
  },
  {
    id: 402,
    projectId: 4,
    title: "Setup Keychain Biometric Storage",
    status: "To Do",
    dueDate: "2025-05-15",
    assignedTo: "", // Unassigned
    onTime: false
  }
];