import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

const SITE_NAME = 'WeShareEduTeach'

interface AnnouncementProps {
  title?: string
  body?: string
  recipientName?: string
}

const AnnouncementEmail = ({ title, body, recipientName }: AnnouncementProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{title || `New announcement from ${SITE_NAME}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>{SITE_NAME}</Text>
        <Heading style={h1}>{title || 'Platform announcement'}</Heading>
        {recipientName && <Text style={greeting}>Hi {recipientName},</Text>}
        <Section style={card}>
          {(body || '').split('\n').map((line, i) => (
            <Text key={i} style={text}>{line || '\u00A0'}</Text>
          ))}
        </Section>
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AnnouncementEmail,
  subject: (data: Record<string, any>) => data.title || `New from ${SITE_NAME}`,
  displayName: 'Platform announcement',
  previewData: { title: 'Welcome aboard', body: 'Thanks for being part of the community.', recipientName: 'Jane' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px', margin: '0 auto' }
const brand = { fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#6b7280', margin: '0 0 12px' }
const h1 = { fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 16px', lineHeight: '1.3' }
const greeting = { fontSize: '14px', color: '#374151', margin: '0 0 16px' }
const card = { backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', margin: '0 0 24px' }
const text = { fontSize: '14px', color: '#1f2937', lineHeight: '1.6', margin: '0 0 8px' }
const footer = { fontSize: '12px', color: '#6b7280', margin: '24px 0 0' }
