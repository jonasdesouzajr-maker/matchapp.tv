# Sports news source setup — twice daily

This source setup exists because GDELT's official DOC 2.0 API was unreachable
over HTTPS/TLS on the repository's GitHub Actions runner on 25 September 2026.
Two live sports collection attempts failed. Retrying the same unreachable host
cannot honestly deliver a twice-daily live-news guarantee.

## Optional commercial-eligible contingency: NewsData.io

NewsData.io currently states that its **Free** Latest News plan may be used
commercially but commonly returns headlines around **12 hours later** than
their first publication. Read its terms and limits yourself before enabling it:

- Official plan: https://newsdata.io/blog/pricing-plan-in-newsdata-io/
- Latest News API: https://newsdata.io/blog/latest-news-endpoint/
- Category filters: https://newsdata.io/blog/categorization-and-tagging-news-api/

1. Register with NewsData.io directly and review its production and commercial
   usage conditions. MatchApp stores no retailer, publisher or payment passwords.
2. In the owner account for this GitHub repository, open
   **Settings → Secrets and variables → Actions → New repository secret**.
3. Name the secret exactly `NEWSDATA_API_KEY`; paste the key there (not in a
   GitHub issue, public file, screenshot, AI prompt or browser application).
4. Open **Actions → Refresh sports news twice daily → Run workflow**. Confirm
   the source succeeds with actual, fresh original-publisher HTTPS links.
   Without a key the existing official GDELT source is still attempted.
5. Confirm source recovery, the website validation, AdSense protection and
   the subsequent production Pages deployment before calling sports updates
   live. GitHub may delay scheduled jobs, so twice daily is a target cadence,
   not a guaranteed publication frequency when the upstream has no qualifying
   current articles.

### Security and editorial contract

- The server-side workflow loads `NEWSDATA_API_KEY` from Actions secrets only.
  Never expose or print the full request URL: the provider uses an `apikey`
  query parameter. Source normalization has strict first-party allowlisted
  original publisher HTTPS domains and validates timestamps and sports topics.
- NewsData.io is a discovery index: **do not copy full article bodies, publisher
  images, headlines from invalid sources or unsupported claims**. Cards link
  directly to the original trusted publisher and keep their exact attribution.
  Third-party indexed publication timestamps must not be stated as independently
  verified first-published dates.
- If the key is absent, expires or the service returns insufficient headlines,
  the script tries the prior GDELT source. When neither works, fail safely and
  preserve the last committed headlines without inventing news or lighting the
  new-headline bell. Hourly entertainment, Kids, catalog matching, AdSense
  placements, Android sources and the editorial serialized publisher remain
  independent and unchanged.
- A commercial use allowance for an aggregation API does **not** by itself
  license republication of every originating publisher's full article, image,
  or video. Review the provider's current license and any applicable publisher
  restrictions before monetizing material beyond original-source link cards.
