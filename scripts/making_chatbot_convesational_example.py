from tla_advisor.start_up import pipeline

#start of empty to collect first requet
history = []

query = "how do i fix the printer"
chat =pipeline.answer(query,history)
response = "".join(pipeline.answer(query, history))

#append to the same logic as how ollama.chat() accepts
history.append({"role": "user", "content": query})
history.append({"role": "assistant", "content": response})
print(chat,history)


#check if second query carries context
query2 = "what if that doesn't work?"
response2 = "".join(pipeline.answer(query2, history))
print(response2)