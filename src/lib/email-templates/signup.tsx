import * as React from 'react'
import { Body, Container, Head, Heading, Hr, Html, Preview, Text } from '@react-email/components'

interface SignupEmailProps {
  siteName: string
  recipient: string
  token: string
}

export const SignupEmail = ({ siteName, token }: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{token} is your {siteName} verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>{siteName}</Text>
        <Heading style={h1}>Verification code</Heading>
        <Text style={text}>Enter the following verification code when prompted:</Text>
        <Text style={code}>{token}</Text>
        <Text style={text}>To protect your account, do not share this code.</Text>
        <Hr style={hr} />
        <Heading as="h3" style={h3}>Didn't request this?</Heading>
        <Text style={small}>
          If you didn't make this request, you can safely ignore this email.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>© {new Date().getFullYear()} {siteName}</Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const brand = { fontSize: '18px', fontWeight: 'bold' as const, color: '#111827', margin: '0 0 28px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#111827', margin: '0 0 16px' }
const h3 = { fontSize: '15px', fontWeight: 'bold' as const, color: '#111827', margin: '0 0 8px' }
const text = { fontSize: '15px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px' }
const small = { fontSize: '13px', color: '#6b7280', lineHeight: '1.6', margin: '0 0 16px' }
const code = { fontSize: '36px', fontWeight: 'bold' as const, color: '#111827', letterSpacing: '4px', margin: '8px 0 24px' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: 0 }
