import {
  Body, Button, Container, Head, Heading, Hr, Html, Img, Link,
  Preview, Section, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

const SITE_NAME = 'WeShare EduTech'
const SITE_URL = 'https://weshareeduteach.name.ng'

interface AnnouncementProps {
  title?: string
  body?: string
  recipientName?: string
  imageUrl?: string
  ctaLabel?: string
  ctaUrl?: string
}

const AnnouncementEmail = ({
  title, body, recipientName, imageUrl, ctaLabel, ctaUrl,
}: AnnouncementProps) => {
  const resolvedCta = ctaUrl
    ? (ctaUrl.startsWith('http') ? ctaUrl : `${SITE_URL}${ctaUrl.startsWith('/') ? '' : '/'}${ctaUrl}`)
    : `${SITE_URL}/dashboard`
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{title || `New from ${SITE_NAME}`}</Preview>
      <Body style={main}>
        <Container style={outer}>
          {/* Brand bar */}
          <Section style={brandBar}>
            <Text style={brandText}>
              {SITE_NAME}<span style={brandDot}>•</span>
            </Text>
          </Section>

          {/* Card */}
          <Section style={card}>
            {imageUrl && (
              <Img
                src={imageUrl}
                alt=""
                width="520"
                style={hero}
              />
            )}
            <Section style={cardInner}>
              <Heading style={h1}>{title || 'Hello'}</Heading>
              {recipientName && <Text style={greeting}>Hi {recipientName},</Text>}
              {(body || '').split('\n').map((line, i) => (
                <Text key={i} style={text}>{line || '\u00A0'}</Text>
              ))}
              <Section style={{ textAlign: 'center', margin: '28px 0 8px' }}>
                <Button href={resolvedCta} style={btn}>
                  {ctaLabel || 'Open'}
                </Button>
              </Section>
            </Section>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>
            © {new Date().getFullYear()} {SITE_NAME} ·{' '}
            <Link href={SITE_URL} style={footerLink}>weshareeduteach.name.ng</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: AnnouncementEmail,
  subject: (data: Record<string, any>) => data.title || `New from ${SITE_NAME}`,
  displayName: 'Platform announcement',
  previewData: {
    title: 'Welcome aboard',
    body: 'Thanks for joining the community. Tap below to jump back in.',
    recipientName: 'Jane',
    ctaLabel: 'Open dashboard',
    ctaUrl: '/dashboard',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif', margin: 0, padding: 0 }
const outer = { maxWidth: '600px', margin: '0 auto', padding: '24px 16px' }
const brandBar = { padding: '4px 0 16px' }
const brandText = { fontSize: '20px', fontWeight: 800 as const, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }
const brandDot = { color: '#2563eb', marginLeft: '6px' }
const card = { backgroundColor: '#0f172a', borderRadius: '14px', overflow: 'hidden' as const }
const hero = { display: 'block', width: '100%', height: 'auto', objectFit: 'cover' as const }
const cardInner = { padding: '28px 28px 24px' }
const h1 = { fontSize: '26px', fontWeight: 800 as const, color: '#ffffff', margin: '0 0 14px', lineHeight: 1.25 }
const greeting = { fontSize: '14px', color: '#cbd5e1', margin: '0 0 12px' }
const text = { fontSize: '15px', color: '#e2e8f0', lineHeight: 1.65, margin: '0 0 10px' }
const btn = { backgroundColor: '#2563eb', color: '#ffffff', padding: '13px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: 600 as const, textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0 12px' }
const footer = { fontSize: '12px', color: '#6b7280', textAlign: 'center' as const, margin: 0 }
const footerLink = { color: '#2563eb', textDecoration: 'none' }
