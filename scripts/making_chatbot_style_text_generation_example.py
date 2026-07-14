from ollama import chat

# 1. Initialize conversation history
messages = [{'role': 'user', 'content': 'What is 17 × 23?'}]

# 2. Call the chat with think=True enabled
stream = chat(
    model='qwen3.5:9b',
    messages=messages,
    stream=True,
    think=False  # Required to trigger chunk.message.thinking
)

in_thinking = False
content = ''
thinking = ''

# 3. Stream and separate the response
for chunk in stream:
    # Handle reasoning trace
    if chunk.message.thinking:
        pass
    # Handle final output content
    elif chunk.message.content:
        if in_thinking:
            in_thinking = False
            print('\n\nAnswer:\n', end='', flush=True)
        print(chunk.message.content, end='', flush=True)
        content += chunk.message.content

print("\n") # Line break after completion

# 4. Append to the message list correctly for the next loop turn
messages.append({
    'role': 'assistant', 
    'content': content
    # You can store 'thinking': thinking locally if needed for your logs
})
