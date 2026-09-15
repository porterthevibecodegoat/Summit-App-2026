import { confirmedSummitGuests2026 } from "@not-alone/config";

export type PersonCategory = "Co-Chairs" | "Hosts" | "Founders" | "Mental Health Nonprofit Founding Partners" | "Musicians" | "Entertainers & Athletes" | "Experts" | "Business Leaders & Philanthropists" | "Sponsors" | "Executive Producers" | "Producers" | "Attendees";

export type SummitPerson = {
  name: string;
  slug: string;
  categories: PersonCategory[];
  role: string;
  bio: string;
  year: 2025 | 2026;
  image?: string;
  order?: number;
  messageable?: boolean;
};

const bio = (name: string, role: string) => `${name} is joining the Not Alone Summit community as ${role.toLowerCase()}. Additional approved biography details will be published as they are confirmed.`;

const make = (name: string, categories: PersonCategory[], role: string, year: 2025 | 2026 = 2026, extra: Partial<SummitPerson> = {}): SummitPerson => ({
  name,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
  categories,
  role,
  bio: bio(name, role),
  year,
  messageable: year === 2026,
  ...extra
});

const candidateProfiles2026: SummitPerson[] = [
  make("Jewel", ["Co-Chairs", "Musicians"], "4-Time Grammy Nominated Singer-Songwriter and Mental Health Pioneer", 2026, { image: "https://static1.squarespace.com/static/628691b65c3a24383d0eac0a/t/68def5c21087564f13f1c2ec/1759442376820/Jewel+smiling.png?format=500w" }),
  make("Steve Wozniak", ["Co-Chairs"], "Co-Founder of Apple & Mental Health Advocate", 2026, { image: "https://static1.squarespace.com/static/628691b65c3a24383d0eac0a/t/68def5c245388537d1d83190/1759442374837/Woz.png?format=500w" }),
  make("Cherrial Odell", ["Co-Chairs"], "Inspiring Children Alumna", 2026, { image: "https://static1.squarespace.com/static/628691b65c3a24383d0eac0a/t/68def5c296aceb2b11467a66/1759442375847/Cherrial.png?format=500w" }),
  make("Jason Kennedy", ["Hosts", "Entertainers & Athletes"], "Entertainment Journalist", 2026, { image: "https://static1.squarespace.com/static/628691b65c3a24383d0eac0a/t/690713f2b377df6a4c77fdde/1762071540470/Jason+Kennedy.jpg" }),
  make("Ryan Wolfington", ["Founders", "Executive Producers"], "Founder, Inspiring Children Foundation", 2026, { order: 1, image: "https://static1.squarespace.com/static/628691b65c3a24383d0eac0a/t/67f862c0eb0ed869a305752d/1744331456513/Ryan+Wolfington+headshot.jpeg?format=500w" }),
  make("Cameron & Winston Kelly", ["Founders"], "Philanthropists", 2026, { order: 2, image: "https://static1.squarespace.com/static/628691b65c3a24383d0eac0a/t/68e609ca36e8ea273aba67ca/1759906250781/Winston+and+Cameron+sq.jpg?format=500w" }),
  make("Steve & Janet Wozniak", ["Founders"], "Apple Computers", 2026, { order: 3, image: "https://static1.squarespace.com/static/628691b65c3a24383d0eac0a/t/68ec81e77594567546cc159d/1760330215338/Steve+and+Janet+Wozniak+sq.jpg?format=500w" }),
  make("Sean & Ana Wolfington", ["Founders"], "Entrepreneurs", 2026, { order: 4, image: "https://static1.squarespace.com/static/628691b65c3a24383d0eac0a/t/68ec81cca6ad7d1cf09d23d5/1760330189118/Sean+and+Ana+Wolfington+sq.jpg?format=500w" }),
  make("Jennifer Smorgon", ["Founders"], "Smorgon Family Foundation", 2026, { order: 5, image: "/people/jennifer-smorgon.png" }),
  make("Erica & Jay McGraw", ["Founders"], "Philanthropists and Mental Health Advocates", 2026, { order: 6, image: "/people/erica-jay-mcgraw.png" }),
  make("Sanem “Sam” Alkan", ["Founders"], "Resonance Philanthropies", 2026, { order: 7, image: "/people/resonance-philanthropies.png" }),
  make("National Alliance on Mental Illness (NAMI)", ["Mental Health Nonprofit Founding Partners"], "Mental Health Nonprofit Founding Partner", 2026, { image: "/people/nami.png" }),
  make("Daniel Gillison", ["Experts"], "NAMI", 2026, { image: "https://static1.squarespace.com/static/628691b65c3a24383d0eac0a/t/69016a89b8d81b19fe04db6d/1761700489951/Daniel+H.+Gillison+Jr.+CEO%2C+NAMI%2C+square+Ann+A+Morris+crop.jpg?format=500w" }),
  make("Marc Brackett", ["Experts"], "Psychologist, Yale", 2026, { image: "https://static1.squarespace.com/static/628691b65c3a24383d0eac0a/t/68defbcb1087564f13f32bdc/1759443920958/Marc+Brackett.png?format=500w" }),
  make("Mike Majlak", ["Experts", "Entertainers & Athletes"], "Impaulsive Podcast", 2026, { image: "https://static1.squarespace.com/static/628691b65c3a24383d0eac0a/t/68df05be96aceb2b1149c844/1759446467479/Mike+Majlak.png?format=500w" }),
  make("Wendy Oliver-Pyatt", ["Experts"], "Internationally Recognized Psychiatrist, Author & Educator", 2026, { image: "/people/wendy--oliver-pyatt.jpg", bio: "Dr. Wendy Oliver-Pyatt is an internationally recognized psychiatrist, author, educator, and leading voice in eating-disorder treatment, mental health, weight stigma, and the harms of diet culture. For more than 25 years, she has challenged conventional thinking and translated emerging science into compassionate, human-centered care.\n\nShe is the founder and CEO of Within Health, Galen Hope, and the Eating Disorder Education Institute. Across five distinctive treatment programs, Dr. Oliver-Pyatt has pioneered integrated approaches grounded in the biopsychosocial model, intensive psychotherapy, behavioral principles, family and community involvement, and rigorous medical and psychiatric care. Her work looks beyond symptoms to understand the biological, psychological, relational, and cultural forces that place people at risk—helping individuals move toward lasting healing, greater freedom, and a more peaceful relationship with themselves.\n\nDr. Oliver-Pyatt completed her specialty training at New York University–Bellevue Hospital and has held faculty appointments at NYU, Albert Einstein College of Medicine, and the University of Nevada School of Medicine. She is board-certified by the American Board of Psychiatry and Neurology in both adult and addiction psychiatry, a Fellow of the Academy for Eating Disorders, and an EDEI Eating Disorder Credentialed Specialist Supervising Consultant.\n\nShe is the author of two books, including Questions and Answers on Binge Eating Disorder: A Guide for Clinicians, and has received Senatorial Recognition for her contributions to the mental health treatment community. She also founded Weight Stigma Awareness Week, reflecting her longstanding commitment to confronting weight-based discrimination and creating a culture in which people of all sizes can receive respectful, evidence-informed care.\n\nAs a speaker, Dr. Oliver-Pyatt brings together clinical authority, visionary leadership, personal warmth, and an unwavering belief in what becomes possible when knowledge is joined with humanity. Her presentations invite audiences not only to reconsider how we understand and treat eating disorders, but also to become active participants in building a more compassionate and effective system of care." }),
  make("Kevin Hines", ["Experts"], "Suicide Prevention Speaker", 2026, { image: "https://static1.squarespace.com/static/628691b65c3a24383d0eac0a/t/690714932b267b4c903f2dd2/1762071700304/Kevin+Hines.jpg?format=500w" }),
  make("David Eagleman", ["Experts"], "Neuroscientist & Inventor", 2026, { image: "https://static1.squarespace.com/static/628691b65c3a24383d0eac0a/t/690713aa32f0d432b696a34f/1762071467583/David+Eagleman.jpg?format=500w", bio: "David Eagleman is a neuroscientist at Stanford University, an internationally bestselling author, and a Guggenheim Fellow. Dr. Eagleman’s areas of research include sensory substitution, time perception, vision, and synesthesia; he also studies the intersection of neuroscience with the legal system, and in that capacity he directs the Center for Science and Law. Eagleman is the author of many books, including Livewired, The Runaway Species, The Brain, Incognito, and Wednesday is Indigo Blue. He is also the author of a widely adopted textbook on cognitive neuroscience, Brain and Behavior, as well as a bestselling book of literary fiction, Sum, which has been translated into 32 languages, turned into two operas, and named a Best Book of the Year by Barnes and Noble. Dr. Eagleman writes for the Atlantic, New York Times, Economist, Time, Discover, Slate, Wired, and New Scientist, and appears regularly on National Public Radio and BBC to discuss both science and literature. He has been a TED speaker, a guest on the Colbert Report, and profiled in the New Yorker magazine. He has spun several neurotech companies out of his lab. He runs the top ranking science podcast Inner Cosmos and is the writer and presenter of The Brain, an Emmy-nominated television series." }),
  make("Jon Hershfield", ["Experts"], "OCD Specialist", 2026, { image: "https://static1.squarespace.com/static/628691b65c3a24383d0eac0a/t/690713f2f04e05756b404e42/1762071540550/Jon+Hershfield.jpg?format=500w" }),
  make("Blaise Aguirre", ["Experts"], "McLean Psychiatric Hospital", 2026, { image: "https://static1.squarespace.com/static/628691b65c3a24383d0eac0a/t/690712b73bc7667f88f7da51/1762071224894/Blaise+Aguirre+red+tie+copy.jpg?format=500w" }),
  make("Loni Love", ["Hosts", "Entertainers & Athletes"], "Comedian and Not Alone Awards Host", 2026, { image: "https://static1.squarespace.com/static/628691b65c3a24383d0eac0a/t/6907156f6f1b4111d77a8bc8/1762071920597/Loni+Love+Alex+Hill+sq+copy.jpg" }),
  make("Bob Bryan", ["Entertainers & Athletes"], "Hall of Fame Tennis Player", 2026, { image: "https://static1.squarespace.com/static/628691b65c3a24383d0eac0a/t/68def9f2cec59767ba07845d/1759443448305/Bob+Mike+Bryan.png?format=500w" }),
  make("Mike Bryan", ["Entertainers & Athletes"], "Hall of Fame Tennis Player", 2026, { image: "https://static1.squarespace.com/static/628691b65c3a24383d0eac0a/t/68def9f2cec59767ba07845d/1759443448305/Bob+Mike+Bryan.png?format=500w" }),
  make("Jeneva Bell", ["Founders"], "Ruggable", 2026, { image: "https://static1.squarespace.com/static/628691b65c3a24383d0eac0a/t/68dee98559c9af3ebb934824/1759439247206/Jeneva+Bell.png?format=500w" }),
  make("Ellie Kanner", ["Founders"], "Friends (TV Show)", 2026, { image: "https://static1.squarespace.com/static/628691b65c3a24383d0eac0a/t/690722ff433d8d7594f3a39f/1762075392189/Ellie+Kanner.jpg?format=500w" }),
  make("Nick Kislinger", ["Founders"], "Flourish Trust", 2026, { image: "https://static1.squarespace.com/static/628691b65c3a24383d0eac0a/t/68f66270f00ba52aaa6d27d3/1760977520763/Nick+Kislinger+sq.jpg?format=500w" }),
  make("Kase Murray", ["Attendees"], "Summit attendee"),
  make("Sarah Steil", ["Musicians"], "Music act"),
  make("Caroline Jones", ["Musicians", "Sponsors"], "Singer-Songwriter and Summit Sponsor", 2026, { image: "/people/caroline-jones.png" }),
  make("Nick Dana", ["Sponsors"], "Summit Sponsor", 2026, { image: "/people/nick-dana.png" }),
  make("Lexi Hensler", ["Entertainers & Athletes"], "Speaker or performer — details pending approval", 2026, { image: "/people/lexi-hensler.png" }),
  ...["Brandon Saho", "Caroline Silby", "Anthony Ramos", "Mario Martinez", "Alana Springsteen"].map((name) => make(name, ["Entertainers & Athletes"], "Speaker or performer — details pending approval")),
  make("Margaret Hines", ["Business Leaders & Philanthropists"], "Business leader and philanthropist", 2026, { image: "/people/margaret-hines.png" }),
  ...["John Ratcliff", "Jessica Edwards", "Morgan Marler", "Erica McGraw", "Jay McGraw", "Leah Smith", "Michael Townsend"].map((name) => make(name, ["Business Leaders & Philanthropists"], "Summit participant — details pending approval")),
  ...["Casey Caruso", "Paige Neuenschwander", "Payton McDonald", "Sydney Fleischmann", "Porter Winterton", "Bianca Mok"].map((name) => make(name, ["Producers"], "Associate Producer")),
  ...["Aphrah Brokaw", "Clark Cummings", "Jan Thwaites", "Sally Dewhurst", "Sophie Novak", "Trent Alenik", "Trevor Short"].map((name) => make(name, ["Producers"], "Summit producer or staff — details pending approval"))
];

export const people2026: SummitPerson[] = confirmedSummitGuests2026.map((name) => {
  const profile = candidateProfiles2026.find((candidate) => candidate.name === name);
  return profile ?? make(name, ["Attendees"], "Confirmed 2026 summit guest");
});

export const people2025: SummitPerson[] = [
  make("Loni Love", ["Hosts", "Entertainers & Athletes"], "Comedian and Not Alone Awards Host", 2025, { image: "https://static1.squarespace.com/static/628691b65c3a24383d0eac0a/t/6907156f6f1b4111d77a8bc8/1762071920597/Loni+Love+Alex+Hill+sq+copy.jpg" }),
  make("Cameron & Winston Kelly", ["Founders"], "Not Alone Summit founders", 2025, { order: 2 }),
  make("Steve & Janet Wozniak", ["Founders"], "Founders", 2025, { order: 5, image: "/people/steve-wozniak.jpg" }),
  make("Paige Neuenschwander", ["Producers"], "Associate Producer", 2025, { image: "/people/paige-neuenschwander.png" }),
  make("Casey Caruso", ["Producers"], "Associate Producer", 2025),
  make("Sydney Fleischmann", ["Producers"], "Associate Producer", 2025),
  make("Porter Winterton", ["Producers"], "Associate Producer", 2025),
  make("Bianca Mok", ["Producers"], "Associate Producer", 2025)
];

export const categories: PersonCategory[] = ["Co-Chairs", "Hosts", "Founders", "Mental Health Nonprofit Founding Partners", "Musicians", "Entertainers & Athletes", "Experts", "Business Leaders & Philanthropists", "Sponsors", "Executive Producers", "Producers", "Attendees"];

export function findPerson(slug: string) {
  return [...people2026, ...people2025].find((person) => person.slug === slug);
}
