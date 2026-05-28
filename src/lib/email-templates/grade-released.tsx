import * as React from "react";
import { Html, Head, Body, Container, Section, Text, Heading, Button, Hr } from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  recipientName?: string;
  lessonTitle: string;
  clarity: number;
  accuracy: number;
  completeness: number;
  total: number;
  feedback: string;
  lessonUrl: string;
}

export function GradeReleasedEmail({ recipientName, lessonTitle, clarity, accuracy, completeness, total, feedback, lessonUrl }: Props) {
  return (
    <Html>
      <Head />
      <Body style={{ background: "#f6f5f0", fontFamily: "Georgia, serif", color: "#1a1a1a" }}>
        <Container style={{ maxWidth: 560, margin: "0 auto", padding: 24, background: "#ffffff", borderRadius: 8 }}>
          <Heading style={{ fontSize: 22, marginBottom: 4 }}>Your Learn-to-Teach score is in</Heading>
          <Text style={{ color: "#666", marginTop: 0 }}>Hi {recipientName || "there"},</Text>
          <Text>Your voice note for <strong>{lessonTitle}</strong> has been graded.</Text>

          <Section style={{ background: "#faf9f4", padding: 16, borderRadius: 6, margin: "16px 0" }}>
            <Text style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{total} / 30</Text>
            <Text style={{ margin: "8px 0 0", fontSize: 14, color: "#555" }}>
              Clarity {clarity}/10 · Accuracy {accuracy}/10 · Completeness {completeness}/10
            </Text>
          </Section>

          {feedback ? (
            <>
              <Text style={{ fontWeight: 600, marginBottom: 4 }}>Feedback</Text>
              <Text style={{ whiteSpace: "pre-wrap" }}>{feedback}</Text>
            </>
          ) : null}

          <Section style={{ textAlign: "center", marginTop: 24 }}>
            <Button href={lessonUrl} style={{ background: "#1a1a1a", color: "#fff", padding: "12px 22px", borderRadius: 6, textDecoration: "none" }}>
              View the lesson
            </Button>
          </Section>

          <Hr style={{ margin: "24px 0", borderColor: "#eee" }} />
          <Text style={{ fontSize: 12, color: "#888" }}>weshareedutech · Learn to Teach</Text>
        </Container>
      </Body>
    </Html>
  );
}

export const template: TemplateEntry = {
  component: GradeReleasedEmail,
  subject: (d) => `Your score for "${d.lessonTitle}" — ${d.total}/30`,
  displayName: "Grade released",
};
