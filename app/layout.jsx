import './globals.css';
import Nav from './_components/Nav';
import Mantra from './_components/Mantra';

export const metadata = {
  title: '//JRNL — Trader Journal',
  description: 'Daily prep, trade log, headspace, calendar.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0f0e0d',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="app">
          <Nav />
          <Mantra kind="bar" />
          <main className="container">{children}</main>
          <div className="footer">
            <Mantra kind="footer" />
          </div>
        </div>
      </body>
    </html>
  );
}
