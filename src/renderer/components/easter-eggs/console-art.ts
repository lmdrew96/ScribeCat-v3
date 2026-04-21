import packageJson from '../../../../package.json';

const ASCII_CAT = `
     /\\_/\\
    ( o.o )
     > ^ <
    /|   |\\
   (_|   |_)
`;

let printed = false;

export function printConsoleArt(): void {
  if (printed) return;
  printed = true;

  const version = (packageJson as { version?: string }).version ?? '0.0.0';

  console.log(
    `%c${ASCII_CAT}%c\nCurious cat found you! 👀%c\nScribeCat v${version} - Brought to You by ADHD: Agentic Development of Human Designs 🧠⚡️%c\nFound a bug? Meow at us on GitHub!\nhttps://github.com/lmdrew96/scribecat-v3`,
    'color: #00ffff; font-family: monospace; font-size: 16px;',
    'color: #ff69b4; font-weight: bold; font-size: 14px;',
    'color: #ffd700; font-size: 12px;',
    'color: #c0c0c0; font-size: 11px;',
  );
}
