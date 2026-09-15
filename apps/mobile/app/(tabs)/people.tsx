import { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, typography } from "@not-alone/design-tokens";
import { confirmedSummitGuests2026 } from "@not-alone/config";

type Category = "Co-Chairs" | "Hosts" | "Founders" | "Mental Health Nonprofit Founding Partners" | "Musicians" | "Entertainers & Athletes" | "Experts" | "Business Leaders & Philanthropists" | "Sponsors" | "Producers" | "Attendees";
type Person = { name: string; role: string; category: Category; secondaryCategory?: Category; image?: string };

const candidateProfiles: Person[] = [
  { name: "Jewel", role: "Singer-Songwriter and Mental Health Pioneer", category: "Co-Chairs", image: "https://static1.squarespace.com/static/628691b65c3a24383d0eac0a/t/68def5c21087564f13f1c2ec/1759442376820/Jewel+smiling.png?format=500w" },
  { name: "Steve Wozniak", role: "Co-Founder of Apple & Mental Health Advocate", category: "Co-Chairs", image: "https://static1.squarespace.com/static/628691b65c3a24383d0eac0a/t/68def5c245388537d1d83190/1759442374837/Woz.png?format=500w" },
  { name: "Cherrial Odell", role: "Inspiring Children Alumna", category: "Co-Chairs", image: "https://static1.squarespace.com/static/628691b65c3a24383d0eac0a/t/68def5c296aceb2b11467a66/1759442375847/Cherrial.png?format=500w" },
  { name: "Jason Kennedy", role: "Entertainment Journalist", category: "Hosts", image: "https://static1.squarespace.com/static/628691b65c3a24383d0eac0a/t/690713f2b377df6a4c77fdde/1762071540470/Jason+Kennedy.jpg" },
  { name: "Ryan Wolfington", role: "Founder, Inspiring Children Foundation", category: "Founders", image: "https://static1.squarespace.com/static/628691b65c3a24383d0eac0a/t/67f862c0eb0ed869a305752d/1744331456513/Ryan+Wolfington+headshot.jpeg?format=500w" },
  { name: "Cameron & Winston Kelly", role: "Philanthropists · Founder position 2", category: "Founders", image: "https://static1.squarespace.com/static/628691b65c3a24383d0eac0a/t/68e609ca36e8ea273aba67ca/1759906250781/Winston+and+Cameron+sq.jpg?format=500w" },
  { name: "Steve & Janet Wozniak", role: "Apple Computers", category: "Founders", image: "https://static1.squarespace.com/static/628691b65c3a24383d0eac0a/t/68ec81e77594567546cc159d/1760330215338/Steve+and+Janet+Wozniak+sq.jpg?format=500w" },
  { name: "Sean & Ana Wolfington", role: "Entrepreneurs", category: "Founders", image: "https://static1.squarespace.com/static/628691b65c3a24383d0eac0a/t/68ec81cca6ad7d1cf09d23d5/1760330189118/Sean+and+Ana+Wolfington+sq.jpg?format=500w" },
  { name: "Jennifer Smorgon", role: "Smorgon Family Foundation", category: "Founders", image: "local:jennifer" },
  { name: "Erica & Jay McGraw", role: "Philanthropists and Mental Health Advocates", category: "Founders", image: "local:mcgraw" },
  { name: "Sanem “Sam” Alkan", role: "Resonance Philanthropies", category: "Founders", image: "local:resonance" },
  { name: "National Alliance on Mental Illness (NAMI)", role: "Mental Health Nonprofit Founding Partner", category: "Mental Health Nonprofit Founding Partners", image: "local:nami" },
  { name: "Jeneva Bell", role: "Ruggable", category: "Founders", image: "https://static1.squarespace.com/static/628691b65c3a24383d0eac0a/t/68dee98559c9af3ebb934824/1759439247206/Jeneva+Bell.png?format=500w" },
  { name: "Kase Murray", role: "Summit attendee", category: "Attendees" },
  { name: "Sarah Steil", role: "Music act", category: "Musicians" },
  { name: "Caroline Jones", role: "Singer-Songwriter and Summit Sponsor", category: "Musicians", secondaryCategory: "Sponsors", image: "local:caroline" },
  { name: "Nick Dana", role: "Summit Sponsor", category: "Sponsors", image: "local:nick" },
  { name: "Loni Love", role: "Comedian and Not Alone Awards Host", category: "Hosts", secondaryCategory: "Entertainers & Athletes", image: "https://static1.squarespace.com/static/628691b65c3a24383d0eac0a/t/6907156f6f1b4111d77a8bc8/1762071920597/Loni+Love+Alex+Hill+sq+copy.jpg" },
  { name: "Mike Majlak", role: "Entertainer and podcast host", category: "Entertainers & Athletes", image: "https://static1.squarespace.com/static/628691b65c3a24383d0eac0a/t/68df05be96aceb2b1149c844/1759446467479/Mike+Majlak.png?format=500w" },
  { name: "Lexi Hensler", role: "Speaker or performer — details pending approval", category: "Entertainers & Athletes", image: "local:lexi" },
  { name: "Margaret Hines", role: "Business leader and philanthropist", category: "Business Leaders & Philanthropists", image: "local:margaret" },
  { name: "Marc Brackett", role: "Psychologist, Yale", category: "Experts", image: "https://static1.squarespace.com/static/628691b65c3a24383d0eac0a/t/68defbcb1087564f13f32bdc/1759443920958/Marc+Brackett.png?format=500w" },
  { name: "Wendy Oliver-Pyatt", role: "Internationally Recognized Psychiatrist, Author & Educator", category: "Experts", image: "local:wendy" },
  { name: "David Eagleman", role: "Neuroscientist & Inventor", category: "Experts", image: "https://static1.squarespace.com/static/628691b65c3a24383d0eac0a/t/690713aa32f0d432b696a34f/1762071467583/David+Eagleman.jpg?format=500w" },
  { name: "Kevin Hines", role: "Suicide Prevention Speaker", category: "Experts", image: "https://static1.squarespace.com/static/628691b65c3a24383d0eac0a/t/690714932b267b4c903f2dd2/1762071700304/Kevin+Hines.jpg?format=500w" },
  { name: "Aphrah Brokaw", role: "Summit producer", category: "Producers" },
  { name: "Paige Neuenschwander", role: "Associate Producer", category: "Producers" },
  { name: "Casey Caruso", role: "Associate Producer", category: "Producers" },
  { name: "Payton McDonald", role: "Associate Producer", category: "Producers" },
  { name: "Sydney Fleischmann", role: "Associate Producer", category: "Producers" },
  { name: "Porter Winterton", role: "Associate Producer", category: "Producers" },
  { name: "Bianca Mok", role: "Associate Producer", category: "Producers" },
  { name: "Morgan Marler", role: "Summit attendee", category: "Attendees" }
];
const people: Person[] = confirmedSummitGuests2026.map((name) =>
  candidateProfiles.find((candidate) => candidate.name === name) ?? {
    name,
    role: "Confirmed 2026 summit guest",
    category: "Attendees"
  }
);
const categories: Category[] = ["Co-Chairs", "Hosts", "Founders", "Mental Health Nonprofit Founding Partners", "Musicians", "Entertainers & Athletes", "Experts", "Business Leaders & Philanthropists", "Sponsors", "Producers", "Attendees"];

export default function PeopleScreen() {
  const [category, setCategory] = useState<Category>("Co-Chairs");
  const visible = useMemo(() => people.filter((person) => person.category === category || person.secondaryCategory === category), [category]);
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.eyebrow}>2026 Summit</Text><Text style={styles.title}>Featuring</Text><Text style={styles.intro}>Meet the people advancing emotional and mental health through science, lived experience, storytelling, music, and innovation.</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>{categories.map((item) => <Pressable key={item} onPress={() => setCategory(item)} style={[styles.tab, item === category && styles.activeTab]}><Text style={[styles.tabText, item === category && styles.activeTabText]}>{item}</Text></Pressable>)}</ScrollView>
    <View style={styles.grid}>{visible.map((person, index) => <Pressable key={`${person.name}-${index}`} style={styles.card}><View style={styles.portrait}>{person.image ? <Image source={person.image === "local:nami" ? require("../../assets/nami.png") : person.image === "local:caroline" ? require("../../assets/caroline-jones.png") : person.image === "local:nick" ? require("../../assets/nick-dana.png") : person.image === "local:wendy" ? require("../../assets/wendy-oliver-pyatt.jpg") : person.image === "local:jennifer" ? require("../../assets/jennifer-smorgon.png") : person.image === "local:mcgraw" ? require("../../assets/erica-jay-mcgraw.png") : person.image === "local:resonance" ? require("../../assets/resonance-philanthropies.png") : person.image === "local:lexi" ? require("../../assets/lexi-hensler.png") : person.image === "local:margaret" ? require("../../assets/margaret-hines.png") : { uri: person.image }} style={styles.image} /> : <Text style={styles.initials}>{person.name.split(" ").map((part) => part[0]).slice(0,2).join("")}</Text>}</View><Text style={styles.name}>{person.name}</Text><Text style={styles.role}>{person.role}</Text><Text style={styles.connect}>View bio · Connect</Text></Pressable>)}</View>
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe:{backgroundColor:colors.canvas,flex:1},content:{padding:spacing.lg,paddingBottom:120},eyebrow:{color:colors.accent,fontFamily:typography.bold,fontSize:11,letterSpacing:1.5,textTransform:"uppercase"},title:{color:colors.plum,fontFamily:typography.display,fontSize:42,marginTop:6},intro:{color:colors.body,fontFamily:typography.body,fontSize:15,lineHeight:23,marginTop:8},tabs:{gap:8,paddingVertical:22},tab:{borderColor:colors.border,borderRadius:999,borderWidth:1,paddingHorizontal:14,paddingVertical:9},activeTab:{backgroundColor:colors.plum,borderColor:colors.plum},tabText:{color:colors.ink,fontFamily:typography.semibold,fontSize:12},activeTabText:{color:"#FFFFFF"},grid:{flexDirection:"row",flexWrap:"wrap",gap:12},card:{backgroundColor:colors.surface,borderRadius:10,overflow:"hidden",paddingBottom:14,width:"48%"},portrait:{alignItems:"center",aspectRatio:1,backgroundColor:colors.plumSoft,justifyContent:"center",width:"100%"},image:{height:"100%",width:"100%"},initials:{color:colors.plum,fontFamily:typography.display,fontSize:34},name:{color:colors.plum,fontFamily:typography.bold,fontSize:15,paddingHorizontal:12,paddingTop:12},role:{color:colors.muted,fontFamily:typography.body,fontSize:11,lineHeight:16,minHeight:42,paddingHorizontal:12,paddingTop:4},connect:{color:colors.accent,fontFamily:typography.bold,fontSize:11,paddingHorizontal:12,paddingTop:7} });
