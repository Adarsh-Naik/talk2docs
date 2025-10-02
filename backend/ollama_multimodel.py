import aiohttp
import json

class OllamaMultimodal:
    def __init__(self, model="gemma3:4b", api_url="http://localhost:11434/api/generate"):
        self.model = model
        self.api_url = api_url
    
    async def stream(self, images_data, prompt):
        """
        Stream response from Ollama multimodal model
        
        Args:
            images_data: List of base64 encoded image strings or single base64 string
            prompt: Text prompt/question about the images
        """
        # Ensure images_data is a list
        if isinstance(images_data, str):
            images_data = [images_data]
        
        # Prepare the request payload
        payload = {
            "model": self.model,
            "prompt": prompt,
            "images": images_data,
            "stream": True
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                self.api_url, 
                json=payload,
                headers={'Content-Type': 'application/json'}
            ) as resp:
                if resp.status != 200:
                    error_text = await resp.text()
                    raise Exception(f"Ollama API error: {resp.status} - {error_text}")
                
                # Stream the response
                async for line in resp.content:
                    if line:
                        try:
                            # Each line is a JSON object
                            line_str = line.decode('utf-8').strip()
                            if line_str:
                                response_data = json.loads(line_str)
                                
                                # Extract the response text
                                if 'response' in response_data:
                                    yield response_data['response']
                                
                                # Check if this is the final response
                                if response_data.get('done', False):
                                    break
                                    
                        except json.JSONDecodeError:
                            # Skip malformed JSON lines
                            continue
                        except Exception as e:
                            print(f"Error processing chunk: {e}")
                            continue