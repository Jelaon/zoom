package aroa.practice.webRtc.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import com.google.gson.Gson;

import aroa.practice.webRtc.handler.SocketHandler;

@Controller
public class MainController {
	
	@Autowired
	SocketHandler socketHandler;

	@GetMapping("/")
	public String main() {
		return "chat";
	}
	
	@ResponseBody
	@GetMapping("/roomList")
	public String roomList() {
		return new Gson().toJson(socketHandler.roomList());
	}
}
