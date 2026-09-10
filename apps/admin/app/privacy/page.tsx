export const metadata = {
  title: "Privacy Policy | Not Alone Summit",
  description: "Privacy policy for the Not Alone Summit attendee app."
};

export default function PrivacyPage() {
  return (
    <main className="publicPageShell">
      <article className="publicDocument">
        <div className="publicBrand">Not Alone Summit</div>
        <div className="kicker">Inspiring Children Foundation</div>
        <h1>Privacy Policy</h1>
        <p className="publicMeta">Last updated September 9, 2026</p>

        <p>
          The Not Alone Summit app is an event guide provided by Inspiring Children Foundation. This policy explains
          the limited information used to provide schedules, saved sessions, event updates, and attendee support.
        </p>

        <h2>Information the app uses</h2>
        <p>
          The app stores your saved sessions and the latest event guide on your device. If notifications are enabled,
          it may register an app-specific push token, app version, device platform, and event access group so the
          correct operational updates can be delivered. The app does not request contacts, photos, camera, microphone,
          or precise location access.
        </p>

        <h2>Concierge questions</h2>
        <p>
          Questions submitted to the attendee concierge may be sent to our secure server to produce an answer grounded
          in the published event schedule and approved event information. Do not include medical records, private health
          information, passwords, payment details, or other sensitive personal information in a question.
        </p>

        <h2>How information is used</h2>
        <p>
          Information is used only to operate the event experience, synchronize published event details, preserve your
          selected sessions, deliver requested notifications, maintain service security, and diagnose reliability issues.
          We do not sell personal information or use app activity for third-party behavioral advertising.
        </p>

        <h2>Retention and choices</h2>
        <p>
          Saved sessions can be removed in the app. Notifications can be disabled in iOS Settings. Operational records
          are retained only as long as reasonably needed for event delivery, security, and legal obligations. You may
          request assistance through the support page below.
        </p>

        <h2>Children and safety</h2>
        <p>
          The event app is not designed to collect personal information from children without appropriate authorization.
          It provides event information, not medical advice, diagnosis, treatment, emergency monitoring, or crisis care.
        </p>

        <h2>Contact</h2>
        <p>
          Privacy and support requests can be sent to music@inspiringchildren.org or submitted through the Inspiring
          Children Foundation contact page.
        </p>
        <div className="publicActions">
          <a href="mailto:music@inspiringchildren.org?subject=Not%20Alone%20Summit%20Privacy">Email Privacy Support</a>
          <a href="https://www.inspiringchildren.org/contact">Contact Inspiring Children Foundation</a>
          <a href="/support">App Support</a>
        </div>
      </article>
    </main>
  );
}
