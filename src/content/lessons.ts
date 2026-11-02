export interface Lesson {
  id: string;
  title: string;
  paragraphs: string[];
  /** A short activity a parent and child can do together. */
  tryThis: string;
}

export const LESSONS: Lesson[] = [
  {
    id: 'what-money-is',
    title: 'What money is',
    paragraphs: [
      'Long ago, people traded things directly: a basket of apples for a pair of shoes. That only works when both people want what the other has.',
      'Money fixes this. It is something everyone agrees to accept, so you can sell apples today and buy shoes next week.',
      'Good money is easy to carry, easy to split into small parts, hard to fake, and it keeps its value over time.',
    ],
    tryThis: 'Look at a coin or a note together. Who made it? Why do shops accept it?',
  },
  {
    id: 'saving',
    title: 'Saving',
    paragraphs: [
      'Saving means keeping some money now so you can use it later. It is a choice between something small today and something bigger tomorrow.',
      'A goal makes saving easier. Write down what you are saving for and how much it costs.',
      'Every small amount counts. Putting a little aside many times adds up to a lot.',
    ],
    tryThis: 'Pick one thing you want. Work out how many weeks of saving it takes.',
  },
  {
    id: 'interest-and-time',
    title: 'Interest and time',
    paragraphs: [
      'When you lend money to a bank, the bank can pay you a little extra for it. That extra is called interest.',
      'If you leave the interest in, next year you earn interest on the interest too. This is called compounding. The longer you wait, the faster it grows.',
      'Time is the most important part. Money saved at age 5 has many more years to grow than money saved at age 17. Prices also change over time, so the same amount can buy more or less later.',
    ],
    tryThis: 'Start with 100. Add 10 percent each year for 5 years. How much do you have? (About 161.)',
  },
  {
    id: 'what-bitcoin-is',
    title: 'What Bitcoin is',
    paragraphs: [
      'Bitcoin is money that exists on the internet. No bank or government runs it. Thousands of computers around the world keep the same list of who owns what.',
      'There will only ever be 21 million bitcoin. Each bitcoin splits into 100 million small parts called satoshis, or sats.',
      'The price of bitcoin can go up and down a lot, sometimes in a single day. That is why it is best to think in years, not days, and never to save more than you can afford to see go down.',
    ],
    tryThis: 'Open the vault page and find the address. Every bitcoin address is a place on that shared list.',
  },
  {
    id: 'keys',
    title: 'Keys, and why you never share them',
    paragraphs: [
      'In Bitcoin, owning money means holding a secret key. The key signs a message that says "move these coins". Anyone who has the key can do that.',
      'A recovery phrase is a list of 12 words that can rebuild the key. Write it on paper and keep it somewhere safe. Never type it into a website you did not choose, never send it in a message, and never show it to someone who asks for it.',
      'If the words are lost, nobody can help you get the coins back. There is no "forgot password" button in Bitcoin.',
    ],
    tryThis: 'Ask: who in our family knows where the recovery paper is? Is that enough people, or too many?',
  },
  {
    id: 'why-18',
    title: 'Why the vault opens at 18',
    paragraphs: [
      'The demo vault on this site has two locks. The parent key opens it at any time, and the child key opens it only after the 18th birthday. The rule is written inside Bitcoin itself: until the date arrives, the network refuses to accept a payment signed by the child key.',
      'The next vault removes the parent lock. Parents, grandparents and friends can put coins in, but nobody can take them out before the child is 18. Only three guardians the family chose can act in an emergency, after a long wait, and only to send the coins to a charity for children.',
      'Waiting is part of the lesson. It gives the savings time to grow and gives the child time to learn how to look after money before they are in charge of it.',
    ],
    tryThis: 'Look at the unlock date on your vault. How old will you be? What would you like to have learned by then?',
  },
];
