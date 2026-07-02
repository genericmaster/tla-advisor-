import ollama
import json
query = "the vpn is not working "
context = """1. Trouble connecting to the VPN. 
As we know Wits uses the Cisco AnyConnect VPN, and staff members rely on it 
as most of the internal sites will not connect or work unless you’re using the 
Wits Wi-Fi or you’re connected on Wits ethernet.  
Steps to Fix: 
1. Check the installed version. Cisco AnyConnect is also available on the 
Microsoft Store, but that version commonly causes problems. 
o If it was installed from the Microsoft Store → uninstall it 
completely, then download the official version from the Wits IT 
access page: https://www.loser.ac.za/access/. The download 
includes a setup document with full instructions. 
o If it was not from the Store → test the user’s credentials and 
confirm that Multi-Factor Authentication (MFA) is enabled on their 
Microsoft account, as the VPN will not work without it. If 
necessary, repair or reinstall the existing installation. 
2. Follow the setup instructions. Make sure all configuration steps from the 
Wits IT document are completed correctly. 
3. Test the connection. To confirm it’s working, connect to the VPN using a 
different Wi-Fi network (e.g., a mobile hotspot), since it won’t work if 
you’re already on Wits Wi-Fi. """

concatinate = query+context
message = f'give detailed steps for each scenario ,user has no acccess to documents{concatinate}'
#testing the request and response 

response = ollama.chat(
    model='qwen2.5:3b',
    format= '',
    messages= [{'role':'assistant','content': message}],
   stream=True
)

#streaming
for chunk in response:
    print(chunk['message']['content'],end ='',flush=True)

# if streaming is false
print(response.message.content)