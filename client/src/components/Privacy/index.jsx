import { useEffect } from 'react';
import { analyticsConfigured } from '../../lib/analytics.js';

// The privacy page, served at /privacy (vercel.json rewrites it to index.html;
// App.jsx picks the state from the pathname). Same cardless editorial treatment
// as the Results tabs.
//
// This page is a description of what the code does, so it has to change WITH
// the code: a new upload path, a new third-party host, or a new stored field
// means a new line here and a new UPDATED date. The Google Analytics paragraph
// renders itself from VITE_GA_ID so it can't drift from the build.
const CONTACT = 'speakablecoach@gmail.com';
const UPDATED = 'October 10, 2026';

export default function Privacy() {
  useEffect(() => {
    const previous = document.title;
    document.title = 'Privacy · Speakable';
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <article className="animate-rise">
      <header className="border-b border-sand pb-8">
        <p className="eyebrow">Privacy</p>
        <h1 className="mt-2 font-display text-4xl leading-tight tracking-tight text-ink md:text-5xl">
          What Speakable does with your data
        </h1>
        <p className="body-copy mt-4 max-w-[44rem]">
          Speakable analyzes your speaking in your browser. This page lists what stays on your
          device, what is stored on a server, and which other services are involved.
        </p>
        <p className="caption mt-4">Last updated {UPDATED}</p>
      </header>

      <Section title="Stays on your device">
        <li>
          Your recordings, audio and video. Speakable never uploads them. They are saved in this
          browser&rsquo;s storage so you can replay them from History.
        </li>
        <li>Transcription, scoring and coaching. They run in your browser.</li>
        <li>
          Camera frames used for eye contact. They are analyzed as you record and are not saved.
          Only the resulting numbers are kept.
        </li>
        <li>Your practice history, unless you sign in.</li>
      </Section>

      <Section title="Live captions">
        <li>
          The captions that appear while you record come from your browser&rsquo;s built-in speech
          recognition, not from Speakable.
        </li>
        <li>
          In Chrome, that feature sends audio from your microphone to Google while you record.
          Safari uses Apple&rsquo;s speech recognition. Speakable does not receive or store that
          audio.
        </li>
        <li>The transcript in your report is produced separately, on your device.</li>
        <li>There is no setting to turn captions off yet.</li>
      </Section>

      <Section title="Stored on our servers">
        <li>
          If you leave an email on the &ldquo;Before you record&rdquo; screen: that email, and the
          source of your visit if the link you followed named one (for example
          &ldquo;instagram&rdquo;). We use it to send updates about Speakable or to ask for
          feedback.
        </li>
        <li>
          If you sign in: your email address and your reports. A report holds your scores, pace,
          filler words, eye-contact numbers and the transcript of what you said. It does not hold
          the recording.
        </li>
        <li>
          For every practice take: five anonymous numbers. The take number, overall score, filler
          percentage, words per minute and eye-contact percentage. They are stored under a random
          ID kept in your browser, separately from your email and account, and are used to measure
          whether people improve.
        </li>
      </Section>

      <Section title="Other services involved">
        <li>Vercel hosts the site and sees standard request data such as your IP address.</li>
        <li>Supabase stores the data listed above and sends sign-in emails.</li>
        <li>Google Fonts serves the typefaces.</li>
        <li>
          Hugging Face serves the speech model, which is downloaded once and then cached in your
          browser.
        </li>
        <li>
          jsDelivr and Google Cloud Storage serve the model and runtime files used for
          transcription and eye contact.
        </li>
        {analyticsConfigured && (
          <li>
            Google Analytics counts visits and the steps you reach (start, recording started,
            recording finished, report ready), with a few numbers such as score, pace and word
            count. It sets cookies and is skipped when your browser sends Do Not Track. It never
            receives your recording, transcript or email.
          </li>
        )}
        <li>
          These services receive your IP address as part of delivering files. None of them is sent
          your recordings or transcripts by Speakable.
        </li>
      </Section>

      <Section title="What we don&rsquo;t do">
        <li>We don&rsquo;t sell your data or show ads.</li>
        <li>We don&rsquo;t upload or listen to your recordings.</li>
        {!analyticsConfigured && (
          <li>
            Speakable sets no cookies. Your settings and history are kept in this browser&rsquo;s
            storage.
          </li>
        )}
      </Section>

      <Section title="Deleting your data">
        <li>
          A recording or report: delete the session in History. If you are signed in, its report is
          removed from your account too.
        </li>
        <li>Everything on this device: clear this site&rsquo;s data in your browser settings.</li>
        <li>
          Your account, your email on our list, or anything else we hold: email <Contact /> and we
          will delete it. You can also ask for a copy of what we hold about you.
        </li>
        <li>
          The anonymous practice numbers are not stored with your email or account, so we cannot
          look yours up.
        </li>
      </Section>

      <Section title="Children">
        <li>Speakable is not intended for children under 13.</li>
      </Section>

      <Section title="Contact and changes">
        <li>Speakable is built and run by Jayden Salman.</li>
        <li>
          Questions or requests: <Contact />.
        </li>
        <li>If this page changes, the date at the top changes with it.</li>
      </Section>
    </article>
  );
}

// Heading on the left, plain statements on the right — the Vocabulary tab's
// "plain note" layout, one rule between sections. `font-sans` because the base
// styles put every h2 in the display face and .statement is an Inter heading.
function Section({ title, children }) {
  return (
    <section className="grid gap-2 border-b border-sand py-8 last:border-b-0 last:pb-0 md:grid-cols-[14rem_1fr] md:gap-8">
      <h2 className="statement font-sans">{title}</h2>
      <ul className="space-y-2 text-[1.0625rem] leading-[1.65] text-muted">{children}</ul>
    </section>
  );
}

function Contact() {
  return (
    <a href={`mailto:${CONTACT}`} className="font-semibold text-brand-500 hover:text-brand-700">
      {CONTACT}
    </a>
  );
}
