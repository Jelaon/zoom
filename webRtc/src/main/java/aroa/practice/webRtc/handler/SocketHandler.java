package aroa.practice.webRtc.handler;

import java.io.IOException;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.google.gson.Gson;
import com.google.gson.JsonObject;

import aroa.practice.webRtc.vo.User;

@Component
public class SocketHandler extends TextWebSocketHandler {

	HashMap<String, User> userSession = new HashMap<String, User>();

	@SuppressWarnings("unchecked")
	@Override
	public void afterConnectionEstablished(WebSocketSession session) throws Exception { // 소켓 연결
		JsonObject jo = new JsonObject();
		jo.addProperty("type", "save");
		jo.addProperty("sessionId", session.getId());
		session.sendMessage(new TextMessage(jo.toString()));
	}

	@Override
	public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception { // 소켓 종료
		if(userSession.get(session.getId()) != null) {
			String roomName = userSession.get(session.getId()).getRoomName();
			JsonObject jo = new JsonObject();
			jo.addProperty("type", "leave");
			jo.addProperty("sessionId", session.getId());
			userSession.remove(session.getId());
			userSession.forEach((key, value) -> {
				if (value.getRoomName().equals(roomName)) {
					sendMsg(value.getSession(), jo.toString());
				}
			});
		}
		
		super.afterConnectionClosed(session, status);
	}

	@Override
	public void handleTextMessage(WebSocketSession session, TextMessage message) {
		JsonObject jsonMessage = new Gson().fromJson(message.getPayload(), JsonObject.class); // 스트링을 객체로
		String sessionId = session.getId();
		String type = jsonMessage.get("type").getAsString();
		String peerId = jsonMessage.get("peerId").getAsString();
		
		if (type.equals("join")) {
			JsonObject joUser = (JsonObject) jsonMessage.get("user");
			User user = new User();
			String roomName = joUser.get("roomName").getAsString();
			String nickName = joUser.get("nickName").getAsString();
			user.setNickName(nickName);
			user.setRoomName(roomName);
			user.setSession(session);
			userSession.put(sessionId, user);
			joUser.addProperty("sessionId", sessionId);

			userSession.forEach((key, value) -> {
				if (!key.equals(sessionId) && value.getRoomName().equals(roomName)) {
					sendMsg(value.getSession(), jsonMessage.toString());
				}
			});
		} else {
			sendMsg(userSession.get(peerId).getSession(), jsonMessage.toString());
		}

	}

	void sendMsg(WebSocketSession session, String message) {
		try {
			synchronized (session) {
				session.sendMessage(new TextMessage(message));
			}
		} catch (IOException e) {
			e.printStackTrace();
		}
	}
	
	public Map<String, Integer> roomList() {
		Set<String> set = new HashSet<String>();
		HashMap<String, Integer> map = new HashMap<String, Integer>();
		String roomName = "";
		for (String key : userSession.keySet()) {
			roomName = userSession.get(key).getRoomName();
			if(set.add(roomName)) {
				map.put(roomName, 1);
			}else {
				map.put(roomName, map.get(roomName) + 1);
			}
			
		}
		return map;
	}
}