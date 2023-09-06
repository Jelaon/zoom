package aroa.practice.webRtc.handler;

import java.net.http.HttpRequest;
import java.util.HashMap;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.google.gson.Gson;
import com.google.gson.JsonObject;

import jakarta.servlet.http.HttpSession;

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
		String b = new Gson().toJson(message); // 객체를 스트링으로 만들어주는거? 
		JsonObject jsonMessage = new Gson().fromJson(message.getPayload(), JsonObject.class); // 스트링을 객체로
				
		String type = jsonMessage.get("type").getAsString();
		String msg = message.getPayload();
		System.out.println(msg);
		
		switch(type) {
		case "join" :
			String roomName = jsonMessage.get("payload").getAsString();
			sessionMap.put(roomName, session);
			System.out.println("join");
			break;
		case "offer" :
			System.out.println("offer");
			break;
		case "answer" :
			System.out.println("answer");
			break;
		case "ice" :
			System.out.println("ice");
			break;
		}
		
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