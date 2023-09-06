package aroa.practice.webRtc.handler;

import java.util.HashMap;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.google.gson.Gson;
import com.google.gson.JsonObject;

@Component
public class SocketHandler extends TextWebSocketHandler {

	HashMap<String, WebSocketSession> sessionMap = new HashMap<>();

	@SuppressWarnings("unchecked")
	@Override
	public void afterConnectionEstablished(WebSocketSession session) throws Exception { // 소켓 연결
		sessionMap.put(session.getId(), session);
		System.out.println(session.getId());
	}

	@Override
	public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception { // 소켓 종료
		sessionMap.remove(session.getId());
		super.afterConnectionClosed(session, status);
	}
	
	@Override
	public void handleTextMessage(WebSocketSession session, TextMessage message) { // 메시지 발송
		System.out.println(message.getPayload() instanceof String);
		String b = new Gson().toJson(message); // 객체를 스트링으로 만들어주는거?
		System.out.println(b instanceof String);
		JsonObject jsonMessage = new Gson().fromJson(message.getPayload(), JsonObject.class); // 스트링을 객체로
		System.out.println(jsonMessage.get("type"));
		System.out.println(jsonMessage.get("type").getAsString() );
		System.out.println(jsonMessage.get("type").getAsString().equals("join"));
		System.out.println(jsonMessage);
		System.out.println(b);
		String msg = message.getPayload();
		for (String key : sessionMap.keySet()) {
			WebSocketSession wss = sessionMap.get(key);
			try {
				wss.sendMessage(new TextMessage(msg));
			} catch (Exception e) {
				e.printStackTrace();
			}
		}
	}
}