import streamlit as st
import requests

API_URL = "http://localhost:8000/chat"

st.set_page_config(
    page_title="TLA Advisor",
    page_icon="●",
    layout="centered",
)

st.markdown(
    """
    <style>
    @media (max-width: 640px) {
        .block-container {
            padding-left: 1rem !important;
            padding-right: 1rem !important;
            padding-top: 1rem !important;
        }
    }
    </style>
    """,
    unsafe_allow_html=True,
)

st.title("TLA Advisor")
st.caption("Staff support knowledge assistant")

if "messages" not in st.session_state:
    st.session_state.messages = []

if not st.session_state.messages:
    st.info("Ask about a support issue to get started — e.g. *the printer won't connect* or *cisco anyconnect keeps failing*.")

for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.write(message["content"])

query = st.chat_input("Describe the issue")

if query:
    with st.chat_message("user"):
        st.write(query)
    st.session_state.messages.append({"role": "user", "content": query})

    with st.chat_message("assistant"):
        try:
            response = requests.post(
                API_URL,
                json={"query": query},
                stream=True,
                timeout=360,
            )
            response.raise_for_status()
            answer = st.write_stream(
                response.iter_content(chunk_size=None, decode_unicode=True)
            )
            st.session_state.messages.append(
                {"role": "assistant", "content": answer}
            )
        except requests.exceptions.RequestException as e:
            error_message = f"Could not reach the advisor service: {e}"
            st.error(error_message)
            st.session_state.messages.append(
                {"role": "assistant", "content": error_message}
            )