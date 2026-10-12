export type CaseSection = {
  title: string;
  paras: string[];
  image?: { src: string; caption: string };
};

export type CaseStudy = {
  slug: string;
  intro: string[];
  sections: CaseSection[];
};

// Product descriptions for prospective clients. Engineering details belong in the separate technical write-ups.
// Facts are adapted from the existing project content; Pac Hub also follows C:/dev/pac-hub/README.md.
export const caseStudies: CaseStudy[] = [
  {
    slug: "pac-forge",
    intro: [
      "Pac Hub is a workspace for industrial engineering projects. It keeps the job's documents, requirements and approvals together, and helps turn an agreed design into the code that controls a machine.",
      "Engineers can work from the same project record, see which version was approved and trace a design decision back to the document it came from.",
    ],
    sections: [
      {
        title: "A project record the team can follow",
        paras: [
          "The starting point is the customer's brief and supporting documents. The team turns those into a description of how the machine should work, with each requirement linked to its source.",
          "Reviews and approvals stay with the project. When the design changes, earlier versions remain available so the team can see what changed and what was agreed.",
        ],
      },
      {
        title: "From an agreed design to machine control",
        paras: [
          "Approved requirements can become a package of machine-control code for engineering review and testing. The design, its supporting documents and the resulting code stay connected throughout the job.",
        ],
      },
    ],
  },
  {
    slug: "mariannes-hair",
    intro: [
      "Marianne's Hair is a website for a hair salon in West End, Brisbane. Clients can browse services and prices, book an appointment or call the salon. Large text and clear buttons make it easy to use on a phone.",
      "The salon owner can update a service or price in her booking system and have the website follow, without maintaining a second price list.",
    ],
    sections: [
      {
        title: "Easy to read",
        paras: [
          "The page uses generous type, clear contrast and buttons that are easy to tap. Clients can find the salon's services and booking options without working through a busy menu.",
        ],
      },
      {
        title: "Prices that stay in step",
        paras: [
          "Services, appointment lengths and prices come from the salon's own catalogue. If a treatment has several prices, the website shows a starting price; if it needs a conversation, it asks the client to contact Marianne.",
        ],
      },
      {
        title: "A clear path to an appointment",
        paras: [
          "Booking and calling are within reach throughout the page. A client can check a treatment, find its price and go straight to making an appointment.",
        ],
      },
    ],
  },
  {
    slug: "pac-technologies",
    intro: [
      "The website for Pac Technologies, an Australian industrial automation firm. It explains the company's services and past projects, with practical guides to help plant managers plan improvements and find the right support.",
      "Visitors can explore the company's work, read about a problem they are facing and get in touch about their own plant.",
    ],
    sections: [
      {
        title: "Help with the decisions before a project",
        paras: [
          "The guides cover topics such as upgrading older control systems and planning automation for food and beverage production. They give plant managers a starting point for discussing scope, downtime and the work their site needs.",
        ],
      },
      {
        title: "Services backed by examples",
        paras: [
          "Service pages and project examples show where the company works and the kinds of engineering support it provides. Visitors can find relevant experience before making an enquiry.",
        ],
      },
      {
        title: "A consistent company presence",
        paras: [
          "The website follows the same visual style as the company's documents and internal tools. Its navigation brings the services, products and advice together in one place.",
        ],
      },
    ],
  },
  {
    slug: "manuva",
    intro: [
      "Manuva helps product brands manage the work behind what they sell. It brings customer orders, materials and production together, so the team can see what to make, what to buy and what each job costs.",
      "It is for businesses that make their own products and need a clearer picture of stock and the work waiting on the floor.",
    ],
    sections: [
      {
        title: "Know what you can make",
        paras: [
          "Each product has a list of the components it needs. Manuva checks those against available stock and material already set aside for other orders, helping the team spot shortages before starting a job.",
        ],
        image: { src: "/v2/manuva-live.jpg", caption: "Manuva" },
      },
      {
        title: "Keep purchasing and stock together",
        paras: [
          "Purchase orders, deliveries and stock counts update the same inventory record. The team can follow a partial delivery, check what is still due and record a count at the location where the stock sits.",
        ],
      },
      {
        title: "Plan the work on the floor",
        paras: [
          "Customer orders feed into production planning. Material requirements and department capacity help the team decide what can run next and where more people or supplies are needed.",
        ],
      },
      {
        title: "See what a job really costs",
        paras: [
          "Material and labour estimates give each job a planned cost. Actual time recorded against the work shows how that estimate compares with what happened, and what that means for the margin.",
        ],
      },
    ],
  },
  {
    slug: "silio",
    intro: [
      "Silio manages weighing and batching for food and animal-feed manufacturers. It checks ingredients against the recipe, records what went into each batch and gives the office a live view of production.",
      "Operators use weighing stations or a handheld scanner for bulk bags. Their checks and sign-offs become part of the batch record as the work happens.",
    ],
    sections: [
      {
        title: "Check the ingredient and the weight",
        paras: [
          "Before an ingredient is signed off, Silio checks that it is the one the recipe calls for and that the measured amount is within the allowed range. The operator's sign-off records who completed that step.",
        ],
        image: { src: "/silio-batch.png", caption: "Ingredient checks within a batch" },
      },
      {
        title: "Keep a record of each batch",
        paras: [
          "A batch record shows which ingredients were used, how much was added and who signed off each step. Substitutions are recorded too, so the team can trace what actually went into the batch.",
        ],
      },
      {
        title: "See what is happening on the floor",
        paras: [
          "The production dashboard shows the orders in progress and the work completed at each station. Managers can open a batch to see which steps are finished and keep track of production without collecting paper sheets at the end of the shift.",
        ],
        image: { src: "/silio-dashboard.png", caption: "The live production overview" },
      },
    ],
  },
];
