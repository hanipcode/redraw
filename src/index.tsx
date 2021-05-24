import "./index.css";
import Redraw, {
  useEffect,
  useState,
  startGame,
  Background,
  Text,
  GameCanvas,
} from "./Redraw";

function App() {
  const [countdown, setCountdown] = useState(0);
  useEffect(() => {
    let time;
    time = setInterval(() => {
      setCountdown((number) => number + 1);
    }, 1000);

    return () => {
      clearTimeout(time);
    };
  }, []);
  return (
    <GameCanvas>
      <Background background="#dadada">
        {[1, 2, 3].map((item) => {
          return (
            <Text offset={40 * item}>
              Countdown - {item} - {countdown}
            </Text>
          );
        })}
        <Text>Salah</Text>
      </Background>
    </GameCanvas>
  );
}

startGame(App);
