import React from 'react';
import styled from 'styled-components';

const Checkbox = () => {
  return (
    <StyledWrapper>
      <label title="Star" className="star">
        <input id="star-checkbox" className="checkbox" type="checkbox" />
        <div className="svg-container">
          <svg xmlns="http://www.w3.org/2000/svg" className="svg-outline" viewBox="0 0 24 24">
            <path d="M12 2.5L9.45 8.5L3 9.06L7.725 13.39L6.25 19.82L12 16.5L17.75 19.82L16.275 13.39L21 9.06L14.55 8.5L12 2.5ZM12 4.75L14 9.33L18.7 9.75L15 13.07L16.18 17.75L12 15.16L7.82 17.75L9 13.07L5.3 9.75L10 9.33L12 4.75Z" />
          </svg>
          <svg xmlns="http://www.w3.org/2000/svg" className="svg-filled" viewBox="0 0 24 24">
            <path d="M12 2.5L9.45 8.5L3 9.06L7.725 13.39L6.25 19.82L12 16.5L17.75 19.82L16.275 13.39L21 9.06L14.55 8.5L12 2.5Z" />
          </svg>
          <svg xmlns="http://www.w3.org/2000/svg" height={100} width={100} className="svg-celebrate">
            <circle r={2} cy={50} cx={50} className="particle" />
            <circle r={2} cy={50} cx={50} className="particle" />
            <circle r={2} cy={50} cx={50} className="particle" />
            <circle r={2} cy={50} cx={50} className="particle" />
            <circle r={2} cy={50} cx={50} className="particle" />
            <circle r={2} cy={50} cx={50} className="particle" />
            <circle r={2} cy={50} cx={50} className="particle" />
            <circle r={2} cy={50} cx={50} className="particle" />
          </svg>
        </div>
      </label>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  .star {
    --star-color: rgb(250, 190, 21);
    position: relative;
    width: 64px; /* Increased from 50px */
    height: 64px; /* Increased from 50px */
    transition: transform 0.3s ease;
    cursor: pointer;
  }

  .star .checkbox {
    position: absolute;
    width: 100%;
    height: 100%;
    opacity: 0;
    z-index: 20;
    cursor: pointer;
  }

  .star .svg-container {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .star .svg-outline,
  .star .svg-filled {
    fill: var(--star-color);
    position: absolute;
    width: 100%;
    height: 100%;
    transition: all 0.3s ease;
  }

  .star .svg-filled {
    animation: keyframes-svg-filled 1s;
    opacity: 0;
    transform: scale(0);
  }

  .star .svg-celebrate {
    position: absolute;
    display: none;
    stroke: var(--star-color);
    fill: var(--star-color);
    stroke-width: 2px;
  }

  .star .particle {
    position: absolute;
    animation-fill-mode: forwards;
    display: none;
  }

  .star .checkbox:checked ~ .svg-container .svg-outline {
    opacity: 0;
  }

  .star .checkbox:checked ~ .svg-container .svg-filled {
    opacity: 1;
    transform: scale(1);
  }

  .star .checkbox:not(:checked) ~ .svg-container .svg-filled {
    animation: keyframes-svg-unfilled 0.3s forwards;
  }

  .star .checkbox:checked ~ .svg-container .svg-celebrate {
    display: block;
  }

  .star .checkbox:checked ~ .svg-container .particle {
    display: block;
  }

  .star .particle:nth-child(1) {
    animation: particle-1 1s cubic-bezier(0.25, 0.1, 0.25, 1);
  }
  .star .particle:nth-child(2) {
    animation: particle-2 1s ease-out;
  }
  .star .particle:nth-child(3) {
    animation: particle-3 1s ease-out;
  }
  .star .particle:nth-child(4) {
    animation: particle-4 1s ease-out;
  }
  .star .particle:nth-child(5) {
    animation: particle-5 1s ease-out;
  }
  .star .particle:nth-child(6) {
    animation: particle-6 1s ease-out;
  }
  .star .particle:nth-child(7) {
    animation: particle-7 1s ease-out;
  }
  .star .particle:nth-child(8) {
    animation: particle-8 1s ease-out;
  }

  @keyframes keyframes-svg-filled {
    0% {
      transform: scale(0);
      opacity: 0;
    }
    25% {
      transform: scale(1.2);
      opacity: 1;
    }
    50% {
      transform: scale(1);
      filter: brightness(1.5);
    }
  }

  @keyframes keyframes-svg-unfilled {
    0% {
      transform: scale(1);
      opacity: 1;
    }
    100% {
      transform: scale(0);
      opacity: 0;
    }
  }

  @keyframes particle-1 {
    0% {
      transform: translate(0, 0) scale(1);
      opacity: 1;
    }
    40% {
      transform: translate(-20px, -25px) scale(0.6);
      opacity: 0.6;
    }
    100% {
      transform: translate(-40px, 40px) scale(0);
      opacity: 0;
    }
  }

  @keyframes particle-2 {
    0% {
      transform: translate(0, 0) scale(1);
      opacity: 1;
    }
    40% {
      transform: translate(20px, -25px) scale(0.6);
      opacity: 0.6;
    }
    100% {
      transform: translate(40px, 40px) scale(0);
      opacity: 0;
    }
  }

  @keyframes particle-3 {
    0% {
      transform: translate(0, 0) scale(1);
      opacity: 1;
    }
    40% {
      transform: translate(-30px, -20px) scale(0.6);
      opacity: 0.6;
    }
    100% {
      transform: translate(-50px, 45px) scale(0);
      opacity: 0;
    }
  }

  @keyframes particle-4 {
    0% {
      transform: translate(0, 0) scale(1);
      opacity: 1;
    }
    40% {
      transform: translate(30px, -20px) scale(0.6);
      opacity: 0.6;
    }
    100% {
      transform: translate(50px, 45px) scale(0);
      opacity: 0;
    }
  }

  @keyframes particle-5 {
    0% {
      transform: translate(0, 0) scale(1);
      opacity: 1;
    }
    45% {
      transform: translate(0, -30px) scale(0.6);
      opacity: 0.6;
    }
    100% {
      transform: translate(0, 40px) scale(0);
      opacity: 0;
    }
  }

  @keyframes particle-6 {
    0% {
      transform: translate(0, 0) scale(1);
      opacity: 1;
    }
    35% {
      transform: translate(-35px, -15px) scale(0.6);
      opacity: 0.6;
    }
    100% {
      transform: translate(-60px, 50px) scale(0);
      opacity: 0;
    }
  }

  @keyframes particle-7 {
    0% {
      transform: translate(0, 0) scale(1);
      opacity: 1;
    }
    35% {
      transform: translate(35px, -15px) scale(0.6);
      opacity: 0.6;
    }
    100% {
      transform: translate(60px, 50px) scale(0);
      opacity: 0;
    }
  }

  @keyframes particle-8 {
    0% {
      transform: translate(0, 0) scale(1);
      opacity: 1;
    }
    45% {
      transform: translate(0, -35px) scale(0.6);
      opacity: 0.6;
    }
    100% {
      transform: translate(0, 45px) scale(0);
      opacity: 0;
    }
  }`;

export default Checkbox;

// Link: https://uiverse.io/anishwij/curly-ladybug-43