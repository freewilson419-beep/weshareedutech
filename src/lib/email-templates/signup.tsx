import * as React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'

interface SignupEmailProps {
  siteName: string
  recipient: string
  token: string
}

export const SignupEmail = ({ siteName, recipient, token }: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {siteName} verification code is {token}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Confirm your email</Heading>
        <Text style={text}>
          Welcome to <strong>{siteName}</strong>. Use the 6-digit code below to verify
          your email address ({recipient}) and finish creating your account.
        </Text>
        <Section style={codeBox}>
          <Text style={codeText}>{token}</Text>
        </Section>
        <Text style={text}>This code will expire shortly. Enter it on the verification screen to continue.</Text>
        <Text style={footer}>If you didn't sign up for {siteName}, you can safely ignore this email.</Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Georgia, serif' }
const container = { padding: '32px 28px', maxWidth: '520px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1a1a1a', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#444', lineHeight: '1.6', margin: '0 0 20px' }
const codeBox = {
  background: '#f6f1e8',
  border: '1px solid #e6dcc8',
  borderRadius: '10px',
  padding: '20px',
  textAlign: 'center' as const,
  margin: '0 0 24px',
}
const codeText = {
  fontFamily: 'Menlo, monospace',
  fontSize: '32px',
  letterSpacing: '10px',
  fontWeight: 'bold' as const,
  color: '#7a1f2b',
  margin: 0,
}
const footer = { fontSize: '12px', color: '#999', margin: '30px 0 0' }
