import type { FieldError } from 'react-hook-form';

interface FieldMessagesProps {
  error?: FieldError;
}

function getMessages(error?: FieldError) {
  if (!error) {
    return [] as string[];
  }

  const typedMessages = error.types ? Object.values(error.types).filter((value): value is string => typeof value === 'string') : [];

  if (typedMessages.length > 0) {
    return [...new Set(typedMessages)];
  }

  return error.message ? [error.message] : [];
}

export function FieldMessages({ error }: FieldMessagesProps) {
  const messages = getMessages(error);

  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="field-messages" aria-live="polite">
      {messages.map((message) => (
        <small key={message}>{message}</small>
      ))}
    </div>
  );
}