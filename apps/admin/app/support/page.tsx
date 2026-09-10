export const metadata = {
  title: "App Support | Not Alone Summit",
  description: "Support information for the Not Alone Summit attendee app."
};

export default function SupportPage() {
  return (
    <main className="publicPageShell">
      <article className="publicDocument">
        <div className="publicBrand">Not Alone Summit</div>
        <div className="kicker">Attendee App Support</div>
        <h1>How can we help?</h1>
        <p>
          For schedule corrections, access questions, venue guidance, notification issues, or technical app support,
          contact the Inspiring Children Foundation team and include “Not Alone Summit App” in your message.
        </p>

        <div className="supportGrid">
          <section>
            <h2>Before contacting support</h2>
            <p>Pull down on Home or Schedule to retrieve the latest published event guide.</p>
          </section>
          <section>
            <h2>Helpful details</h2>
            <p>Include your iPhone model, iOS version, app version, and a short description of what happened.</p>
          </section>
        </div>

        <h2>Emergency and crisis support</h2>
        <p>
          This app is not emergency or crisis support. If you or someone you know is in crisis in the United States,
          call or text 988. For an immediate emergency, call 911 or go to the nearest emergency department.
        </p>

        <div className="publicActions">
          <a href="mailto:music@inspiringchildren.org?subject=Not%20Alone%20Summit%20App%20Support">Email App Support</a>
          <a href="https://www.inspiringchildren.org/contact">Contact Event Support</a>
          <a href="https://www.inspiringchildren.org/summit">Summit Website</a>
          <a href="/privacy">Privacy Policy</a>
        </div>
      </article>
    </main>
  );
}
