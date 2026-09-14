/**
 * Comprehensive list of global occupations for the profile "Occupation" field.
 *
 * The combobox is fully freeform: users can type and save any occupation that
 * isn't listed here (e.g., a highly specialized or emerging role). This list is
 * a large, cross-industry catalog of well-known titles used for suggestion.
 */
export const OCCUPATIONS: string[] = [
  // Healthcare & medicine
  "Physician", "Doctor", "Surgeon", "Nurse", "Nurse Practitioner", "Midwife",
  "Pharmacist", "Dentist", "Dental Hygienist", "Psychiatrist", "Psychologist",
  "Therapist", "Physical Therapist", "Occupational Therapist", "Speech Therapist",
  "Cardiologist", "Dermatologist", "Pediatrician", "Gynecologist", "Radiologist",
  "Anesthesiologist", "Paramedic", "Emergency Medical Technician", "Veterinarian",
  "Veterinary Technician", "Medical Laboratory Scientist", "Radiographer",
  "Chiropractor", "Optometrist", "Audiologist", "Nutritionist", "Dietitian",
  "Pathologist", "Neurologist", "Oncologist", "Urologist", "Endocrinologist",
  "Massage Therapist", "Acupuncturist", "Home Health Aide", "Medical Assistant",
  "Phlebotomist", "Medical Coder", "Health Administrator", "Public Health Officer",
  "Epidemiologist", "Microbiologist", "Genetic Counselor",

  // Technology & engineering
  "Software Engineer", "Software Developer", "Frontend Developer", "Backend Developer",
  "Full-Stack Developer", "Mobile Developer", "DevOps Engineer", "Data Scientist",
  "Data Analyst", "Machine Learning Engineer", "AI Engineer", "Cloud Engineer",
  "Cybersecurity Analyst", "Network Engineer", "Systems Administrator",
  "Database Administrator", "IT Support Specialist", "QA Engineer", "QA Tester",
  "Web Designer", "UX Designer", "UI Designer", "Product Designer",
  "Product Manager", "Project Manager", "Scrum Master", "Tech Lead",
  "Engineering Manager", "Site Reliability Engineer", "Blockchain Developer",
  "Game Developer", "Embedded Systems Engineer", "Robotics Engineer",
  "Hardware Engineer", "Electrical Engineer", "Mechanical Engineer",
  "Civil Engineer", "Structural Engineer", "Chemical Engineer", "Aerospace Engineer",
  "Biomedical Engineer", "Environmental Engineer", "Industrial Engineer",
  "Petroleum Engineer", "Materials Engineer", "Architect", "Drafter",
  "Technical Writer", "Information Security Analyst", "Penetration Tester",

  // Business, finance & law
  "Accountant", "Chartered Accountant", "Auditor", "Financial Analyst",
  "Investment Banker", "Portfolio Manager", "Wealth Manager", "Financial Advisor",
  "Bank Teller", "Loan Officer", "Actuary", "Economist", "Statistician",
  "Business Analyst", "Management Consultant", "Entrepreneur", "Business Owner",
  "Startup Founder", "CEO", "COO", "CFO", "CTO", "Business Development Manager",
  "Sales Manager", "Account Executive", "Real Estate Agent", "Real Estate Broker",
  "Property Manager", "Insurance Agent", "Underwriter", "Tax Consultant",
  "Bookkeeper", "Payroll Specialist", "Lawyer", "Attorney", "Solicitor", "Barrister",
  "Paralegal", "Legal Assistant", "Judge", "Notary", "Compliance Officer",
  "Risk Manager", "Procurement Specialist", "Human Resources Manager",
  "HR Specialist", "Recruiter", "Payroll Manager", "Administrative Assistant",
  "Executive Assistant", "Office Manager", "Receptionist", "Customer Service Representative",
  "Call Center Agent", "Operations Manager", "Supply Chain Manager", "Logistics Coordinator",
// Education & academia
  "Teacher", "Elementary School Teacher", "High School Teacher", "University Professor",
  "Lecturer", "Teaching Assistant", "Tutor", "Preschool Teacher", "Special Education Teacher",
  "Substitute Teacher", "School Principal", "Vice Principal", "School Counselor",
  "Dean", "Academic Advisor", "Researcher", "Research Scientist", "Research Assistant",
  "Lab Technician", "Philosopher", "Historian", "Sociologist", "Anthropologist",
  "Political Scientist", "Linguist", "Translator", "Interpreter", "Librarian",
  "Instructional Designer", "Curriculum Developer", "Early Childhood Educator",

  // Art, design & media
  "Graphic Designer", "Illustrator", "Animator", "Photographer", "Videographer",
  "Video Editor", "Film Director", "Film Producer", "Screenwriter", "Actor", "Actress",
  "Musician", "Singer", "Songwriter", "Composer", "Music Producer", "DJ",
  "Dancer", "Choreographer", "Painter", "Sculptor", "Ceramic Artist", "Digital Artist",
  "Fashion Designer", "Fashion Model", "Makeup Artist", "Hair Stylist", "Nail Technician",
  "Tattoo Artist", "Interior Designer", "Landscape Architect", "Art Director",
  "Creative Director", "Copywriter", "Content Writer", "Journalist", "Reporter",
  "Editor", "Blogger", "Influencer", "Social Media Manager", "Public Relations Specialist",
  "Podcast Host", "Radio Host", "Television Presenter", "News Anchor", "Cartoonist",
  "Comic Book Artist", "Poet", "Author", "Novelist", "Ghostwriter", "Video Game Artist",

  // Hospitality, travel & food
  "Chef", "Sous Chef", "Line Cook", "Pastry Chef", "Baker", "Barista", "Bartender",
  "Waiter", "Waitress", "Restaurant Manager", "Restaurant Owner", "Food Critic",
  "Sommelier", "Caterer", "Food Stylist", "Hotel Manager", "Front Desk Agent",
  "Concierge", "Housekeeping Supervisor", "Tour Guide", "Travel Agent", "Travel Blogger",
  "Cruise Director", "Flight Attendant", "Pilot", "Captain", "Airline Ground Staff",
  "Ramp Agent", "Event Planner", "Wedding Planner", "Party Planner", "Catering Manager",

  // Skilled trades & construction
  "Carpenter", "Electrician", "Plumber", "Welder", "Mason", "Bricklayer", "Painter",
  "Roofer", "Glazier", "HVAC Technician", "Construction Manager", "Site Foreman",
  "General Contractor", "Drywall Installer", "Floor Installer", "Tiler", "Locksmith",
  "Landscaper", "Garden Designer", "Pool Technician", "Security Guard", "Building Inspector",
  "Quantity Surveyor", "Crane Operator", "Forklift Operator", "Machine Operator",
  "Toolmaker", "Sheet Metal Worker", "Fabricator", "Auto Mechanic", "Diesel Mechanic",
  "Aircraft Mechanic", "Bicycle Mechanic", "Motorcycle Mechanic", "Tire Technician",
  "Auto Body Technician", "Car Detailer", "Tailor", "Seamstress", "Shoemaker", "Jeweler",
  "Watchmaker", "Glassblower", "Carpet layer", "Upholsterer",
// Science & environment
  "Chemist", "Physicist", "Biologist", "Botanist", "Zoologist", "Ecologist",
  "Geologist", "Meteorologist", "Astronomer", "Astrophysicist", "Marine Biologist",
  "Forensic Scientist", "Environmental Scientist", "Conservation Scientist",
  "Wildlife Biologist", "Park Ranger", "Forestry Worker", "Agronomist", "Horticulturist",
  "Farmer", "Rancher", "Vineyard Owner", "Fisherman", "Fisheries Manager", "Beekeeper",
  "Florist", "Land Surveyor",

  // Government, military & public safety
  "Police Officer", "Detective", "Firefighter", "Customs Officer",
  "Border Patrol Agent", "Immigration Officer", "Correctional Officer",
  "Security Officer", "Soldier", "Military Officer", "Intelligence Analyst", "Diplomat",
  "Ambassador", "Civil Servant", "Government Official", "Public Administrator",
  "Senator", "Member of Parliament", "Mayor", "Governor", "Politician",
  "Policy Analyst", "Urban Planner", "Tax Inspector", "Postal Worker", "Mail Carrier",

  // Sports & fitness
  "Athlete", "Professional Athlete", "Footballer", "Soccer Player", "Basketball Player",
  "Tennis Player", "Golfer", "Boxer", "Martial Artist", "Swimmer", "Runner",
  "Cyclist", "Cricketer", "Rugby Player", "Volleyball Player", "Coach",
  "Fitness Trainer", "Personal Trainer", "Yoga Instructor", "Pilates Instructor",
  "Gym Owner", "Nutrition Coach", "Referee", "Sports Commentator",
  "Sports Agent", "Gymnast", "Surfer", "Skier", "Scuba Diving Instructor",

  // Transportation & logistics
  "Truck Driver", "Bus Driver", "Taxi Driver", "Ride-Share Driver", "Delivery Driver",
  "Courier", "Train Driver", "Conductor", "Ship Captain", "Sailor", "Seafarer",
  "Warehouse Worker", "Forklift Driver", "Inventory Specialist",
  "Freight Forwarder", "Chauffeur", "Porter", "Ticket Inspector",

  // Other / professional services
  "Freelancer", "Consultant", "Salesperson", "Retail Associate",
  "Cashier", "Store Manager", "Merchandiser", "Boutique Owner", "E-commerce Seller",
  "Market Trader", "Auctioneer", "Appraiser", "Curator", "Museum Guide",
  "Event Host", "Emcee", "Telemarketer", "Clerk",
  "Secretary", "Reception Staff", "Cleaner", "Janitor", "Laundry Attendant",
  "Dry Cleaner", "Spa Therapist", "Nanny", "Babysitter", "Caregiver", "Housekeeper",
  "Personal Chef", "Dog Walker", "Pet Groomer", "Pest Control Technician",
];

/** Deduplicated + alphabetically sorted copy used for suggestions. */
export const OCCUPATIONS_SORTED: string[] = Array.from(new Set(OCCUPATIONS)).sort(
  (a, b) => a.localeCompare(b)
);

/** Suggest occupations matching the query (case-insensitive). */
export function searchOccupations(query: string, max = 10): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return OCCUPATIONS_SORTED.slice(0, max);
  // Prefer starts-with matches, then substring matches.
  const starts = OCCUPATIONS_SORTED.filter((o) => o.toLowerCase().startsWith(q));
  const contains = OCCUPATIONS_SORTED.filter(
    (o) => !o.toLowerCase().startsWith(q) && o.toLowerCase().includes(q)
  );
  return [...starts, ...contains].slice(0, max);
}

export const OCCUPATION_COUNT = OCCUPATIONS.length;