/**
 * Couples Corner — professional ad-campaign copy suggestions.
 *
 * 500 distinct, hand-tuned-feeling title + description pairs generated
 * deterministically from curated building blocks (no randomness, no
 * duplicates). Used by the admin advertisement creation form as a
 * dropdown / generator so admins never start from a blank field.
 */

export interface AdCopySuggestion {
  id: string;
  title: string;
  description: string;
  theme: string;
}

const THEMES = [
  "Date Night",
  "Anniversary",
  "Weekend Getaway",
  "Couples Retreat",
  "VIP Membership",
  "Dinner Experience",
  "Love Story",
  "Proposal",
  "Wellness Escape",
  "City Adventure",
];

/** 50 professional title templates — {theme} is replaced per suggestion. */
const TITLE_TEMPLATES = [
  "Reignite Your {theme} With Someone Special",
  "The {theme} Every Couple Deserves",
  "Make Your Next {theme} Unforgettable",
  "A {theme} Crafted for Two",
  "Fall in Love All Over Again — {theme} Edition",
  "Your Perfect {theme} Starts Here",
  "Celebrate Love With an Exclusive {theme}",
  "The Ultimate {theme} Experience for Couples",
  "Rediscover Romance Through Our {theme}",
  "A Premium {theme} You Will Always Remember",
  "Turn Ordinary Evenings Into a Magical {theme}",
  "The {theme} Couples Are Raving About",
  "Begin Your Next Chapter With a Dream {theme}",
  "An Intimate {theme} Designed Around You",
  "Elevate Your Love Story With Our {theme}",
  "The {theme} Package Worth Celebrating",
  "Where Great Love Stories Meet the Perfect {theme}",
  "A Heartfelt {theme} for Modern Couples",
  "Treat Yourselves to a Signature {theme}",
  "The {theme} That Brings Couples Closer",
  "Create Lasting Memories With Our {theme}",
  "A Joyful {theme} for You and Your Partner",
  "Experience the Magic of a Curated {theme}",
  "The {theme} Designed for Unforgettable Moments",
  "Love Deserves More — Start With This {theme}",
  "A Timeless {theme} for Every Love Story",
  "Share Something Special: Our Exclusive {theme}",
  "The {theme} That Turns Moments Into Memories",
  "Plan the {theme} You Have Always Dreamed Of",
  "A Romantic {theme} Without the Stress",
  "Discover the Joy of a Thoughtful {theme}",
  "The {theme} That Makes Every Occasion Shine",
  "Two Hearts, One Perfect {theme}",
  "A Boutique {theme} Tailored for Couples",
  "The {theme} Your Relationship Deserves",
  "Slow Down and Savour This Beautiful {theme}",
  "A Once-in-a-Season {theme} Celebration",
  "The {theme} That Feels Made Just for You",
  "Write Your Next Love Chapter — {theme}",
  "A Warm, Personal {theme} for Real Couples",
  "The {theme} That Keeps the Spark Alive",
  "Gather, Laugh, Love — The Perfect {theme}",
  "A Thoughtfully Curated {theme} for Two",
  "The {theme} Everyone Will Ask You About",
  "Cherish Every Moment of This Lovely {theme}",
  "A Modern {theme} With a Romantic Soul",
  "The {theme} That Exceeds Every Expectation",
  "Say Yes to a Beautiful {theme} Together",
  "A Relaxed, Joyful {theme} for Busy Couples",
  "The {theme} That Feels Like a Fairytale",
];

/** 50 professional description templates. */
const DESCRIPTION_TEMPLATES = [
  "Give your {themeLower} the attention it deserves — {benefit}. {cta}",
  "Built for {audience}, this {themeLower} pairs {benefit}. {cta}",
  "From first hello to final toast, enjoy {benefit} on every {themeLower}. {cta}",
  "Couples love how effortless it feels: {benefit}, all in one booking. {cta}",
  "Make it a night to remember with {benefit}, styled for {audience}. {cta}",
  "Skip the planning stress — we handle {benefit} while you enjoy each other. {cta}",
  "A hand-finished {themeLower} featuring {benefit}. {cta}",
  "Join {audience} who chose this {themeLower} for {benefit}. {cta}",
  "Every detail considered: {benefit}, wrapped in warm hospitality. {cta}",
  "Celebrate in style with {benefit} — perfect for {audience}. {cta}",
  "Turn a simple evening into a story worth retelling with {benefit}. {cta}",
  "Designed with care for {audience}: expect {benefit}. {cta}",
  "Enjoy an easy, elegant {themeLower} with {benefit}. {cta}",
  "What is included? {benefitCapital} — plus a few delightful surprises. {cta}",
  "Real reviews, real romance: couples praise {benefit} on this {themeLower}. {cta}",
  "Limited seasonal availability with {benefit} for {audience}. {cta}",
  "A cosy, premium {themeLower} delivering {benefit} from arrival to farewell. {cta}",
  "Perfect for first dates or golden anniversaries — {benefit}. {cta}",
  "Let our hosts take care of {benefit} while you focus on each other. {cta}",
  "Thoughtful touches throughout: {benefit}, recommended by {audience}. {cta}",
  "Arrive as guests, leave with a memory — featuring {benefit}. {cta}",
  "An affordable touch of luxury: {benefit} on this signature {themeLower}. {cta}",
  "Share laughter, good food, and {benefit} on a {themeLower} built for two. {cta}",
  "Evenings fill quickly — secure {benefit} before the weekend calendar closes. {cta}",
  "Our most-loved {themeLower}: {benefit}, loved by {audience}. {cta}",
  "A calm, romantic setting with {benefit} and zero planning hassle. {cta}",
  "Surprise your partner with {benefit} on a beautifully staged {themeLower}. {cta}",
  "Gather your favourite people or keep it private — {benefit} either way. {cta}",
  "Tastefully styled, warmly hosted, with {benefit} throughout your {themeLower}. {cta}",
  "From golden hour to last dance, expect {benefit} and heartfelt service. {cta}",
  "A fresh take on romance: this {themeLower} includes {benefit}. {cta}",
  "Weeknight or weekend, enjoy {benefit} at a pace that suits you. {cta}",
  "Crafted by local hosts and chefs — {benefit} with authentic flavour. {cta}",
  "Bring your story; we bring {benefit} and a picture-perfect setting. {cta}",
  "Ideal for proposals, anniversaries, or just-because evenings: {benefit}. {cta}",
  "Comfort meets celebration with {benefit} on every {themeLower} booking. {cta}",
  "A guest-favourite {themeLower} with {benefit}, rated highly by {audience}. {cta}",
  "Small details, big feelings: {benefit} arranged just for the two of you. {cta}",
  "Choose your date, invite your person — we provide {benefit}. {cta}",
  "Glow a little brighter together with {benefit} on this {themeLower}. {cta}",
  "No queues, no guesswork — just {benefit} and quality time together. {cta}",
  "A celebration-ready {themeLower}: {benefit}, with flexible rescheduling. {cta}",
  "Feel pampered from check-in to farewell with {benefit}. {cta}",
  "Stories begin here: couples remember {benefit} long after the night ends. {cta}",
  "An evening engineered for connection, with {benefit} throughout. {cta}",
  "Premium yet relaxed — {benefit} without the premium fuss. {cta}",
  "The kind of night you will talk about for months: {benefit}. {cta}",
  "Simple to book, beautiful to experience — {benefit} included. {cta}",
  "Because love deserves the best: {benefit} on this exclusive {themeLower}. {cta}",
  "End the week beautifully with {benefit} and unhurried time together. {cta}",
];

const BENEFITS = [
  "private rooftop seating with skyline views",
  "a chef-curated three-course dinner for two",
  "live acoustic music and candlelit ambience",
  "a sunset boat cruise with complimentary drinks",
  "a couples spa ritual with aromatherapy massage",
  "a guided vineyard tour with premium tasting",
  "a luxury weekend stay with late checkout",
  "a professional photo session to capture the night",
  "a hands-on cooking class with a guest chef",
  "a stargazing experience with gourmet picnic",
];

const AUDIENCES = [
  "new couples discovering the city together",
  "engaged partners planning their next chapter",
  "busy parents reclaiming a night for themselves",
  "long-distance partners reuniting for the weekend",
  "celebrating couples marking a milestone moment",
  "newlyweds designing their first traditions",
  "adventurous pairs chasing weekend thrills",
  "food-loving couples exploring new flavours",
  "wellness-minded partners recharging together",
  "romantics planning an unforgettable proposal",
];

const CTAS = [
  "Reserve your table in under a minute — spots fill fast every weekend.",
  "Tap Learn more to preview venues, menus, and real couple reviews.",
  "Book today and unlock a complimentary upgrade while availability lasts.",
  "Join thousands of couples already making Friday nights unforgettable.",
  "Claim this limited-season offer before the calendar closes.",
];

function buildSuggestions(): AdCopySuggestion[] {
  const out: AdCopySuggestion[] = [];
  const seen = new Set<string>();
  // 500 slots: title template cycles every 50, theme block changes every 50,
  // so each (titleTemplate, theme) pairing is unique -> 50 x 10 = 500 titles.
  // Description template + benefit + audience + cta are scattered with
  // coprime steps so neighbouring suggestions feel varied, not sequential.
  for (let n = 0; n < 500; n += 1) {
    const ti = n % TITLE_TEMPLATES.length;
    const k = Math.floor(n / TITLE_TEMPLATES.length); // 0..9
    const theme = THEMES[(ti + k) % THEMES.length];
    const di = (n * 13 + k * 7) % DESCRIPTION_TEMPLATES.length;
    const benefit = BENEFITS[(n * 3 + k) % BENEFITS.length];
    const audience = AUDIENCES[(n * 7 + k * 3) % AUDIENCES.length];
    const cta = CTAS[(n + k) % CTAS.length];
    const title = TITLE_TEMPLATES[ti].replaceAll("{theme}", theme);
    const benefitCapital = benefit.charAt(0).toUpperCase() + benefit.slice(1);
    const description = DESCRIPTION_TEMPLATES[di]
      .replaceAll("{themeLower}", theme.toLowerCase())
      .replaceAll("{benefitCapital}", benefitCapital)
      .replaceAll("{benefit}", benefit)
      .replaceAll("{audience}", audience)
      .replaceAll("{cta}", cta);
    const key = `${title}|||${description}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: `ad-copy-${String(out.length + 1).padStart(3, "0")}`,
      title,
      description,
      theme,
    });
  }
  return out;
}

export const AD_COPY_SUGGESTIONS: AdCopySuggestion[] = buildSuggestions();

export const AD_COPY_THEMES: string[] = [...new Set(AD_COPY_SUGGESTIONS.map((s) => s.theme))];
