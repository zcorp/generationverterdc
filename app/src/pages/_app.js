import Head from "next/head";
import "../styles/globals.css";
import { SessionProvider } from "next-auth/react";

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  return (
    <>
      <Head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" href="/brand/logo.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="robots" content="index,follow" />
      </Head>
      <SessionProvider session={session}><Component {...pageProps} /></SessionProvider>
    </>
  );
}
